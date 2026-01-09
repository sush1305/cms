
import { 
  UUID, Status, Program, Topic, Term, Lesson, Asset, User, Role, 
  AssetVariant, AssetType, ContentType 
} from './types';

// Utils
const generateId = () => Math.random().toString(36).substr(2, 9);

const STORAGE_KEY = 'chaishorts_db';

class Database {
  private programs: Program[] = [];
  private topics: Topic[] = [];
  private terms: Term[] = [];
  private lessons: Lesson[] = [];
  private assets: Asset[] = [];
  private users: User[] = [];

  constructor() {
    this.load();
  }

  private load() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.programs = parsed.programs || [];
        this.topics = parsed.topics || [];
        this.terms = parsed.terms || [];
        this.lessons = parsed.lessons || [];
        this.assets = parsed.assets || [];
        this.users = parsed.users || [];
      } catch (e) {
        console.error("Failed to parse stored DB:", e);
      }
    }
    
    if (this.users.length === 0) {
      this.seed();
    }
  }

  private seed() {
    this.users = [
      { id: 'u1', username: 'Super Admin', email: 'admin@chaishorts.com', password: 'admin123', role: Role.ADMIN },
      { id: 'u2', username: 'Content Editor', email: 'editor@chaishorts.com', password: 'editor123', role: Role.EDITOR },
      { id: 'u3', username: 'Guest Viewer', email: 'viewer@chaishorts.com', password: 'viewer123', role: Role.VIEWER },
    ];
    this.topics = [
      { id: 't1', name: 'Productivity' },
      { id: 't2', name: 'Lifestyle' },
      { id: 't3', name: 'Coding' },
      { id: 't4', name: 'Finance' },
    ];
    this.save();
  }

  private save() {
    try {
      const data = {
        programs: this.programs,
        topics: this.topics,
        terms: this.terms,
        lessons: this.lessons,
        assets: this.assets,
        users: this.users
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("CRITICAL: Failed to write to localStorage:", e);
    }
  }

  // --- Constraints ---
  private checkProgramTermUnique(programId: UUID, termNumber: number, termId?: UUID) {
    const exists = this.terms.find(t => t.program_id === programId && t.term_number === termNumber && t.id !== termId);
    if (exists) throw new Error(`Term number ${termNumber} already exists in this program.`);
  }

  private checkTermLessonUnique(termId: UUID, lessonNumber: number, lessonId?: UUID) {
    const exists = this.lessons.find(l => l.term_id === termId && l.lesson_number === lessonNumber && l.id !== lessonId);
    if (exists) throw new Error(`Lesson number ${lessonNumber} already exists in this term.`);
  }

  // --- Getters ---
  getPrograms() { return [...this.programs]; }
  getProgram(id: string) { return this.programs.find(p => p.id === id); }
  getTopics() { return [...this.topics]; }
  getTerms(programId: string) { 
    return this.terms
      .filter(t => t.program_id === programId)
      .sort((a, b) => a.term_number - b.term_number); 
  }
  getTerm(id: string) { return this.terms.find(t => t.id === id); }
  getLessons(termId: string) { 
    return this.lessons
      .filter(l => l.term_id === termId)
      .sort((a, b) => a.lesson_number - b.lesson_number); 
  }
  getLesson(id: string) { return this.lessons.find(l => l.id === id); }
  getAssets(parentId: string) { return this.assets.filter(a => a.parent_id === parentId); }
  getUsers() { return [...this.users]; }
  getUserByEmail(email: string) { 
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()); 
  }
  
  // --- Mutations ---
  createUser(user: Omit<User, 'id'>) {
    if (this.getUserByEmail(user.email)) {
      throw new Error(`A team member with email ${user.email} is already registered.`);
    }
    const newUser = { ...user, id: generateId(), email: user.email.toLowerCase().trim() } as User;
    this.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(user: User) {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      this.users[idx] = { ...user };
      this.save();
    }
  }

  deleteUser(userId: string) {
    if (userId === 'u1') return;
    this.users = this.users.filter(u => u.id !== userId);
    this.save();
  }

  // Fix for Error in file components/Settings.tsx on line 37: Property 'changePassword' does not exist on type 'Database'.
  changePassword(userId: UUID, newPassword: string): boolean {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      this.users[idx] = { ...this.users[idx], password: newPassword };
      this.save();
      return true;
    }
    return false;
  }

  createProgram(program: Partial<Program>) {
    const newProg = { 
      ...program, 
      id: generateId(), 
      status: Status.DRAFT,
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      languages_available: program.languages_available || [program.language_primary || 'en'],
      topic_ids: program.topic_ids || []
    } as Program;
    this.programs.push(newProg);
    this.save();
    return newProg;
  }

  updateProgram(program: Program) {
    // Enforce logic: Primary language must be in available languages
    if (!program.languages_available.includes(program.language_primary)) {
        program.languages_available.push(program.language_primary);
    }

    const idx = this.programs.findIndex(p => p.id === program.id);
    if (idx !== -1) {
      this.programs[idx] = { ...program, updated_at: new Date().toISOString() };
      this.save();
    }
  }

  deleteProgram(id: string) {
    const pTerms = this.terms.filter(t => t.program_id === id).map(t => t.id);
    this.programs = this.programs.filter(p => p.id !== id);
    this.terms = this.terms.filter(t => t.program_id !== id);
    this.lessons = this.lessons.filter(l => !pTerms.includes(l.term_id));
    this.assets = this.assets.filter(a => a.parent_id !== id && !pTerms.includes(a.parent_id));
    this.save();
  }

  createTerm(term: Partial<Term>) {
    this.checkProgramTermUnique(term.program_id!, term.term_number!);
    const newTerm = { ...term, id: generateId(), created_at: new Date().toISOString() } as Term;
    this.terms.push(newTerm);
    this.save();
    return newTerm;
  }

  deleteTerm(id: string) {
    const termLessons = this.lessons.filter(l => l.term_id === id).map(l => l.id);
    this.terms = this.terms.filter(t => t.id !== id);
    this.lessons = this.lessons.filter(l => l.term_id !== id);
    this.assets = this.assets.filter(a => a.parent_id !== id && !termLessons.includes(a.parent_id));
    this.save();
  }

  createLesson(lesson: Partial<Lesson>) {
    this.checkTermLessonUnique(lesson.term_id!, lesson.lesson_number!);
    const newLesson = { 
        ...lesson, 
        id: generateId(), 
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(),
        duration_ms: lesson.duration_ms || 0
    } as Lesson;
    this.lessons.push(newLesson);
    this.save();
    return newLesson;
  }

  updateLesson(lesson: Lesson) {
    this.checkTermLessonUnique(lesson.term_id, lesson.lesson_number, lesson.id);
    
    // Constraint: Scheduled must have publish_at
    if (lesson.status === Status.SCHEDULED && !lesson.publish_at) {
        throw new Error("Scheduled lessons must have a release timestamp.");
    }
    
    // Constraint: Published must have published_at (manual publish)
    if (lesson.status === Status.PUBLISHED && !lesson.published_at) {
        lesson.published_at = new Date().toISOString();
    }

    const idx = this.lessons.findIndex(l => l.id === lesson.id);
    if (idx !== -1) {
      this.lessons[idx] = { ...lesson, updated_at: new Date().toISOString() };
      this.autoPublishProgram(lesson.term_id);
      this.save();
    }
  }

  deleteLesson(id: string) {
    this.lessons = this.lessons.filter(l => l.id !== id);
    this.assets = this.assets.filter(a => a.parent_id !== id);
    this.save();
  }

  upsertAsset(asset: Omit<Asset, 'id'>) {
    const existingIndex = this.assets.findIndex(a => 
      a.parent_id === asset.parent_id && 
      a.language === asset.language && 
      a.variant === asset.variant && 
      a.asset_type === asset.asset_type
    );
    if (existingIndex > -1) {
      this.assets[existingIndex] = { ...asset, id: this.assets[existingIndex].id } as Asset;
    } else {
      this.assets.push({ ...asset, id: generateId() } as Asset);
    }
    this.save();
  }

  // --- Automation / Worker ---
  processScheduled() {
    const now = new Date();
    let updatedCount = 0;
    
    // Transactional simulation: Batch update
    const nextLessons = this.lessons.map(l => {
      if (l.status === Status.SCHEDULED && l.publish_at && new Date(l.publish_at) <= now) {
        updatedCount++;
        // Idempotent: Only set published_at if not set
        return { 
            ...l, 
            status: Status.PUBLISHED, 
            published_at: l.published_at || new Date().toISOString() 
        };
      }
      return l;
    });
    
    if (updatedCount > 0) {
      this.lessons = nextLessons;
      
      // Auto-publish programs based on rule
      this.programs = this.programs.map(p => {
          const pTerms = this.terms.filter(t => t.program_id === p.id).map(t => t.id);
          const hasPublished = this.lessons.some(l => pTerms.includes(l.term_id) && l.status === Status.PUBLISHED);
          if (hasPublished && p.status !== Status.PUBLISHED) {
              return { ...p, status: Status.PUBLISHED, published_at: p.published_at || new Date().toISOString() };
          }
          return p;
      });
      
      this.save();
      console.log(`[Worker] Auto-published ${updatedCount} lessons.`);
    }
  }

  private autoPublishProgram(termId: UUID) {
    const term = this.terms.find(t => t.id === termId);
    if (!term) return;
    const programId = term.program_id;
    const program = this.programs.find(p => p.id === programId);
    if (!program) return;

    const programTerms = this.terms.filter(t => t.program_id === programId).map(t => t.id);
    const hasPublishedLesson = this.lessons.some(l => programTerms.includes(l.term_id) && l.status === Status.PUBLISHED);

    if (hasPublishedLesson && program.status !== Status.PUBLISHED) {
      const updatedProgram = {
        ...program,
        status: Status.PUBLISHED,
        published_at: program.published_at || new Date().toISOString()
      };
      this.updateProgram(updatedProgram);
    }
  }

  // --- Health Check ---
  getHealth() {
      return {
          status: 'OK',
          database: 'Connected (LocalStorage)',
          version: '1.0.0'
      };
  }
}

export const db = new Database();
