
import { 
  UUID, Status, Program, Topic, Term, Lesson, Asset, User, Role, 
  AssetVariant, AssetType, ContentType 
} from './types';

// Initial Seed Data Generation
const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_TOPICS: Topic[] = [
  { id: 't1', name: 'Productivity' },
  { id: 't2', name: 'Lifestyle' },
  { id: 't3', name: 'Coding' },
  { id: 't4', name: 'Finance' },
];

const INITIAL_USERS: User[] = [
  { id: 'u1', username: 'Super Admin', email: 'admin@chaishorts.com', password: 'admin123', role: Role.ADMIN },
  { id: 'u2', username: 'Content Editor', email: 'editor@chaishorts.com', password: 'editor123', role: Role.EDITOR },
  { id: 'u3', username: 'Guest Viewer', email: 'viewer@chaishorts.com', password: 'viewer123', role: Role.VIEWER },
];

const INITIAL_PROGRAMS: Program[] = [
  {
    id: 'p1',
    title: 'The Modern Coder',
    description: 'Learn the latest in web development and software architecture.',
    language_primary: 'en',
    languages_available: ['en', 'hi'],
    status: Status.PUBLISHED,
    published_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date().toISOString(),
    topic_ids: ['t3']
  },
  {
    id: 'p2',
    title: 'Personal Finance 101',
    description: 'Master your money and build long-term wealth.',
    language_primary: 'en',
    languages_available: ['en'],
    status: Status.DRAFT,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    topic_ids: ['t4']
  }
];

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
        this.topics = parsed.topics || INITIAL_TOPICS;
        this.terms = parsed.terms || [];
        this.lessons = parsed.lessons || [];
        this.assets = parsed.assets || [];
        this.users = parsed.users || INITIAL_USERS;
      } catch (e) {
        this.resetToDefaults();
      }
    } else {
      this.resetToDefaults();
    }
  }

  private resetToDefaults() {
    this.programs = [...INITIAL_PROGRAMS];
    this.topics = [...INITIAL_TOPICS];
    this.users = [...INITIAL_USERS];
    this.save();
  }

  private save() {
    const data = {
      programs: this.programs,
      topics: this.topics,
      terms: this.terms,
      lessons: this.lessons,
      assets: this.assets,
      users: this.users
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  getPrograms() { return [...this.programs]; }
  getProgram(id: string) { return this.programs.find(p => p.id === id); }
  getTopics() { return [...this.topics]; }
  getTerms(programId: string) { return this.terms.filter(t => t.program_id === programId).sort((a, b) => a.term_number - b.term_number); }
  getLessons(termId: string) { return this.lessons.filter(l => l.term_id === termId).sort((a, b) => a.lesson_number - b.lesson_number); }
  getLesson(id: string) { return this.lessons.find(l => l.id === id); }
  getAssets(parentId: string) { return this.assets.filter(a => a.parent_id === parentId); }
  
  getUsers() { return [...this.users]; }
  getUserByEmail(email: string) { 
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()); 
  }
  
  createUser(user: Omit<User, 'id'>) {
    const newUser = { ...user, id: generateId() } as User;
    this.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(user: User) {
    this.users = this.users.map(u => u.id === user.id ? user : u);
    this.save();
  }

  changePassword(userId: string, newPassword: string) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.password = newPassword;
      this.save();
      return true;
    }
    return false;
  }

  deleteUser(userId: string) {
    this.users = this.users.filter(u => u.id !== userId);
    this.save();
  }

  createProgram(program: Partial<Program>) {
    const newProg = { 
      ...program, 
      id: generateId(), 
      status: Status.DRAFT,
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    } as Program;
    this.programs.push(newProg);
    this.save();
    return newProg;
  }

  updateProgram(program: Program) {
    this.programs = this.programs.map(p => p.id === program.id ? { ...program, updated_at: new Date().toISOString() } : p);
    this.save();
  }

  deleteProgram(id: string) {
    this.programs = this.programs.filter(p => p.id !== id);
    const pTerms = this.terms.filter(t => t.program_id === id).map(t => t.id);
    this.terms = this.terms.filter(t => t.program_id !== id);
    this.lessons = this.lessons.filter(l => !pTerms.includes(l.term_id));
    this.assets = this.assets.filter(a => a.parent_id !== id);
    this.save();
  }

  createTerm(term: Partial<Term>) {
    const newTerm = { ...term, id: generateId(), created_at: new Date().toISOString() } as Term;
    this.terms.push(newTerm);
    this.save();
    return newTerm;
  }

  deleteTerm(id: string) {
    this.terms = this.terms.filter(t => t.id !== id);
    this.lessons = this.lessons.filter(l => l.term_id !== id);
    this.save();
  }

  updateLesson(lesson: Lesson) {
    this.lessons = this.lessons.map(l => l.id === lesson.id ? { ...lesson, updated_at: new Date().toISOString() } : l);
    this.autoPublishProgram(lesson.term_id);
    this.save();
  }

  createLesson(lesson: Partial<Lesson>) {
    const newLesson = { ...lesson, id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Lesson;
    this.lessons.push(newLesson);
    this.save();
    return newLesson;
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
      this.assets[existingIndex] = { ...asset, id: this.assets[existingIndex].id };
    } else {
      this.assets.push({ ...asset, id: generateId() });
    }
    this.save();
  }

  processScheduled() {
    const now = new Date();
    let updatedCount = 0;
    this.lessons = this.lessons.map(l => {
      if (l.status === Status.SCHEDULED && l.publish_at && new Date(l.publish_at) <= now) {
        updatedCount++;
        return { ...l, status: Status.PUBLISHED, published_at: new Date().toISOString() };
      }
      return l;
    });
    
    if (updatedCount > 0) {
        this.programs.forEach(p => {
            const pTerms = this.terms.filter(t => t.program_id === p.id).map(t => t.id);
            const hasPublished = this.lessons.some(l => pTerms.includes(l.term_id) && l.status === Status.PUBLISHED);
            if (hasPublished && p.status !== Status.PUBLISHED) {
                p.status = Status.PUBLISHED;
                if (!p.published_at) p.published_at = new Date().toISOString();
            }
        });
        this.save();
        console.log(`Worker: Published ${updatedCount} scheduled lessons.`);
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
      program.status = Status.PUBLISHED;
      if (!program.published_at) {
        program.published_at = new Date().toISOString();
      }
      this.updateProgram(program);
    }
  }
}

export const db = new Database();
