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
    
    // If no users or no programs, run seed to ensure a good demo experience
    if (this.users.length === 0 || this.programs.length === 0) {
      this.seed();
    }
  }

  private seed() {
    // 1. Users
    this.users = [
      { id: 'u1', username: 'Super Admin', email: 'admin@chaishorts.com', password: 'admin123', role: Role.ADMIN },
      { id: 'u2', username: 'Content Editor', email: 'editor@chaishorts.com', password: 'editor123', role: Role.EDITOR },
      { id: 'u3', username: 'Guest Viewer', email: 'viewer@chaishorts.com', password: 'viewer123', role: Role.VIEWER },
    ];

    // 2. Topics
    this.topics = [
      { id: 't1', name: 'Productivity' },
      { id: 't2', name: 'Lifestyle' },
      { id: 't3', name: 'Coding' },
      { id: 't4', name: 'Finance' },
    ];

    // 3. Programs
    const p1Id = 'p1';
    const p2Id = 'p2';
    
    this.programs = [
      {
        id: p1Id,
        title: 'Mastering the Art of Chai',
        description: 'A deep dive into the history, science, and practice of brewing the perfect cup of tea across different cultures.',
        language_primary: 'en',
        languages_available: ['en', 'hi'],
        status: Status.PUBLISHED,
        published_at: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date().toISOString(),
        topic_ids: ['t2']
      },
      {
        id: p2Id,
        title: 'React Design Patterns',
        description: 'Advanced techniques for building scalable, maintainable, and high-performance React applications.',
        language_primary: 'en',
        languages_available: ['en'],
        status: Status.DRAFT,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        topic_ids: ['t3', 't1']
      }
    ];

    // 4. Terms
    const term1Id = 'tm1';
    const term2Id = 'tm2';
    this.terms = [
      { id: term1Id, program_id: p1Id, term_number: 1, title: 'Foundations', created_at: new Date().toISOString() },
      { id: term2Id, program_id: p2Id, term_number: 1, title: 'Hooks Mastery', created_at: new Date().toISOString() }
    ];

    // 5. Lessons (6 total)
    const now = new Date();
    const future = new Date(now.getTime() + 120000); // 2 minutes from now

    this.lessons = [
      // Program 1 Lessons
      {
        id: 'l1', term_id: term1Id, lesson_number: 1, title: 'The History of Tea', content_type: ContentType.VIDEO,
        duration_ms: 300000, is_paid: false, content_language_primary: 'en', content_languages_available: ['en', 'hi'],
        content_urls_by_language: { en: 'https://example.com/en-history', hi: 'https://example.com/hi-history' },
        subtitle_languages: ['en'], subtitle_urls_by_language: { en: 'https://example.com/en-sub' },
        status: Status.PUBLISHED, published_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString()
      },
      {
        id: 'l2', term_id: term1Id, lesson_number: 2, title: 'Milk and Spices', content_type: ContentType.VIDEO,
        duration_ms: 450000, is_paid: true, content_language_primary: 'en', content_languages_available: ['en'],
        content_urls_by_language: { en: 'https://example.com/spices' },
        subtitle_languages: [], subtitle_urls_by_language: {},
        status: Status.PUBLISHED, published_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString()
      },
      {
        id: 'l3', term_id: term1Id, lesson_number: 3, title: 'The Perfect Boil', content_type: ContentType.VIDEO,
        duration_ms: 180000, is_paid: false, content_language_primary: 'en', content_languages_available: ['en'],
        content_urls_by_language: { en: 'https://example.com/boil' },
        subtitle_languages: [], subtitle_urls_by_language: {},
        status: Status.SCHEDULED, publish_at: future.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString()
      },
      // Program 2 Lessons
      {
        id: 'l4', term_id: term2Id, lesson_number: 1, title: 'Introduction to Patterns', content_type: ContentType.ARTICLE,
        duration_ms: 0, is_paid: false, content_language_primary: 'en', content_languages_available: ['en'],
        content_urls_by_language: { en: 'https://example.com/intro' },
        subtitle_languages: [], subtitle_urls_by_language: {},
        status: Status.DRAFT, created_at: now.toISOString(), updated_at: now.toISOString()
      },
      {
        id: 'l5', term_id: term2Id, lesson_number: 2, title: 'Compound Components', content_type: ContentType.VIDEO,
        duration_ms: 600000, is_paid: true, content_language_primary: 'en', content_languages_available: ['en'],
        content_urls_by_language: { en: 'https://example.com/compound' },
        subtitle_languages: ['en'], subtitle_urls_by_language: { en: 'https://example.com/compound-sub' },
        status: Status.DRAFT, created_at: now.toISOString(), updated_at: now.toISOString()
      },
      {
        id: 'l6', term_id: term2Id, lesson_number: 3, title: 'Render Props', content_type: ContentType.VIDEO,
        duration_ms: 500000, is_paid: false, content_language_primary: 'en', content_languages_available: ['en'],
        content_urls_by_language: { en: 'https://example.com/render' },
        subtitle_languages: [], subtitle_urls_by_language: {},
        status: Status.DRAFT, created_at: now.toISOString(), updated_at: now.toISOString()
      }
    ];

    // 6. Assets (Posters for Programs, Thumbnails for Lessons)
    this.assets = [
      // Program Posters (P1)
      { id: 'a1', parent_id: p1Id, language: 'en', variant: AssetVariant.PORTRAIT, asset_type: AssetType.POSTER, url: 'https://images.unsplash.com/photo-1544787210-2827448636b2?q=80&w=800&auto=format&fit=crop' },
      { id: 'a2', parent_id: p1Id, language: 'en', variant: AssetVariant.LANDSCAPE, asset_type: AssetType.POSTER, url: 'https://images.unsplash.com/photo-1594631252845-29fc458631b6?q=80&w=1200&auto=format&fit=crop' },
      // Program Posters (P2)
      { id: 'a3', parent_id: p2Id, language: 'en', variant: AssetVariant.PORTRAIT, asset_type: AssetType.POSTER, url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=800&auto=format&fit=crop' },
      { id: 'a4', parent_id: p2Id, language: 'en', variant: AssetVariant.LANDSCAPE, asset_type: AssetType.POSTER, url: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=1200&auto=format&fit=crop' },
      
      // Lesson Thumbnails (L1)
      { id: 'a5', parent_id: 'l1', language: 'en', variant: AssetVariant.PORTRAIT, asset_type: AssetType.THUMBNAIL, url: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?q=80&w=600&auto=format&fit=crop' },
      { id: 'a6', parent_id: 'l1', language: 'en', variant: AssetVariant.LANDSCAPE, asset_type: AssetType.THUMBNAIL, url: 'https://images.unsplash.com/photo-1576092729250-a9cdeedc87b1?q=80&w=800&auto=format&fit=crop' },
      // Lesson Thumbnails (L2)
      { id: 'a7', parent_id: 'l2', language: 'en', variant: AssetVariant.PORTRAIT, asset_type: AssetType.THUMBNAIL, url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=600&auto=format&fit=crop' },
      { id: 'a8', parent_id: 'l2', language: 'en', variant: AssetVariant.LANDSCAPE, asset_type: AssetType.THUMBNAIL, url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800&auto=format&fit=crop' }
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
    // If termId is empty string, return all lessons (used in Catalog view logic)
    if (!termId) return [...this.lessons];
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
    const pLessons = this.lessons.filter(l => pTerms.includes(l.term_id)).map(l => l.id);
    
    this.programs = this.programs.filter(p => p.id !== id);
    this.terms = this.terms.filter(t => t.program_id !== id);
    this.lessons = this.lessons.filter(l => !pTerms.includes(l.term_id));
    this.assets = this.assets.filter(a => 
        a.parent_id !== id && 
        !pTerms.includes(a.parent_id) && 
        !pLessons.includes(a.parent_id)
    );
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
    
    if (lesson.status === Status.SCHEDULED && !lesson.publish_at) {
        throw new Error("Scheduled lessons must have a release timestamp.");
    }
    
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
    // FIX: Filter out assets belonging to the deleted lesson, rather than keeping only them.
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
    
    const nextLessons = this.lessons.map(l => {
      if (l.status === Status.SCHEDULED && l.publish_at && new Date(l.publish_at) <= now) {
        updatedCount++;
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

  getHealth() {
      return {
          status: 'OK',
          database: 'Connected (LocalStorage)',
          version: '1.0.0'
      };
  }
}

export const db = new Database();