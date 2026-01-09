
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

const INITIAL_TERMS: Term[] = [
  { id: 'tm1', program_id: 'p1', term_number: 1, title: 'Foundations', created_at: new Date().toISOString() },
  { id: 'tm2', program_id: 'p1', term_number: 2, title: 'Advanced Concepts', created_at: new Date().toISOString() },
];

const INITIAL_LESSONS: Lesson[] = [
  {
    id: 'l1',
    term_id: 'tm1',
    lesson_number: 1,
    title: 'Introduction to React 19',
    content_type: ContentType.VIDEO,
    duration_ms: 300000,
    is_paid: false,
    content_language_primary: 'en',
    content_languages_available: ['en'],
    content_urls_by_language: { 'en': 'https://example.com/v1.mp4' },
    subtitle_languages: ['en'],
    subtitle_urls_by_language: { 'en': 'https://example.com/s1.vtt' },
    status: Status.PUBLISHED,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'l2',
    term_id: 'tm1',
    lesson_number: 2,
    title: 'Server Components Deep Dive',
    content_type: ContentType.VIDEO,
    duration_ms: 450000,
    is_paid: true,
    content_language_primary: 'en',
    content_languages_available: ['en'],
    content_urls_by_language: { 'en': 'https://example.com/v2.mp4' },
    subtitle_languages: ['en'],
    subtitle_urls_by_language: { 'en': 'https://example.com/s2.vtt' },
    status: Status.SCHEDULED,
    publish_at: new Date(Date.now() + 120000).toISOString(), // 2 minutes from now
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const INITIAL_ASSETS: Asset[] = [
  { id: 'a1', parent_id: 'p1', language: 'en', variant: AssetVariant.PORTRAIT, asset_type: AssetType.POSTER, url: 'https://picsum.photos/400/600?seed=chaicoder' },
  { id: 'a2', parent_id: 'p1', language: 'en', variant: AssetVariant.LANDSCAPE, asset_type: AssetType.POSTER, url: 'https://picsum.photos/1200/600?seed=chaicoder' },
  { id: 'a3', parent_id: 'l1', language: 'en', variant: AssetVariant.PORTRAIT, asset_type: AssetType.THUMBNAIL, url: 'https://picsum.photos/400/600?seed=react' },
  { id: 'a4', parent_id: 'l1', language: 'en', variant: AssetVariant.LANDSCAPE, asset_type: AssetType.THUMBNAIL, url: 'https://picsum.photos/1200/600?seed=react' },
];

class Database {
  private programs: Program[] = [...INITIAL_PROGRAMS];
  private topics: Topic[] = [...INITIAL_TOPICS];
  private terms: Term[] = [...INITIAL_TERMS];
  private lessons: Lesson[] = [...INITIAL_LESSONS];
  private assets: Asset[] = [...INITIAL_ASSETS];
  private users: User[] = [...INITIAL_USERS];

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
    return newUser;
  }

  updateUser(user: User) {
    this.users = this.users.map(u => u.id === user.id ? user : u);
  }

  changePassword(userId: string, newPassword: string) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.password = newPassword;
      return true;
    }
    return false;
  }

  deleteUser(userId: string) {
    this.users = this.users.filter(u => u.id !== userId);
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
    return newProg;
  }

  updateProgram(program: Program) {
    this.programs = this.programs.map(p => p.id === program.id ? { ...program, updated_at: new Date().toISOString() } : p);
  }

  deleteProgram(id: string) {
    this.programs = this.programs.filter(p => p.id !== id);
    const pTerms = this.terms.filter(t => t.program_id === id).map(t => t.id);
    this.terms = this.terms.filter(t => t.program_id !== id);
    this.lessons = this.lessons.filter(l => !pTerms.includes(l.term_id));
    this.assets = this.assets.filter(a => a.parent_id !== id);
  }

  createTerm(term: Partial<Term>) {
    const newTerm = { ...term, id: generateId(), created_at: new Date().toISOString() } as Term;
    this.terms.push(newTerm);
    return newTerm;
  }

  deleteTerm(id: string) {
    this.terms = this.terms.filter(t => t.id !== id);
    this.lessons = this.lessons.filter(l => l.term_id !== id);
  }

  updateLesson(lesson: Lesson) {
    this.lessons = this.lessons.map(l => l.id === lesson.id ? { ...lesson, updated_at: new Date().toISOString() } : l);
    this.autoPublishProgram(lesson.term_id);
  }

  createLesson(lesson: Partial<Lesson>) {
    const newLesson = { ...lesson, id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Lesson;
    this.lessons.push(newLesson);
    return newLesson;
  }

  deleteLesson(id: string) {
    this.lessons = this.lessons.filter(l => l.id !== id);
    this.assets = this.assets.filter(a => a.parent_id !== id);
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
        // Trigger auto-publish for programs if necessary
        this.programs.forEach(p => {
            const pTerms = this.terms.filter(t => t.program_id === p.id).map(t => t.id);
            const hasPublished = this.lessons.some(l => pTerms.includes(l.term_id) && l.status === Status.PUBLISHED);
            if (hasPublished && p.status !== Status.PUBLISHED) {
                p.status = Status.PUBLISHED;
                if (!p.published_at) p.published_at = new Date().toISOString();
            }
        });
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
