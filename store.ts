
import { 
  UUID, Status, Program, Topic, Term, Lesson, Asset, User, Role, 
  AssetVariant, AssetType, ContentType 
} from './types';

// Robust UUID v4 Generator for Database Compatibility
const generateId = (): UUID => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }) as UUID;
};

const API_BASE = '/api';

const DEFAULT_USERS: User[] = [
  { id: 'u1', username: 'Administrator', email: 'admin@chaishorts.com', password: 'admin123', role: Role.ADMIN },
  { id: 'u2', username: 'Content Editor', email: 'editor@chaishorts.com', password: 'editor123', role: Role.EDITOR },
  { id: 'u3', username: 'Guest Viewer', email: 'viewer@chaishorts.com', password: 'viewer123', role: Role.VIEWER }
];

class Database {
  private programs: Program[] = [];
  private topics: Topic[] = [];
  private terms: Term[] = [];
  private lessons: Lesson[] = [];
  private assets: Asset[] = [];
  private users: User[] = [...DEFAULT_USERS];
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async init() {
    if (this.isInitialized) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const endpoints = ['programs', 'topics', 'terms', 'lessons', 'assets', 'users'];
        const results = await Promise.all(
          endpoints.map(async (ep) => {
            try {
              const res = await fetch(`${API_BASE}/${ep}`, {
                headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
              });
              if (!res.ok) return [];
              const data = await res.json();
              return Array.isArray(data) ? data : [];
            } catch (err) {
              return [];
            }
          })
        );

        const [p, t, tm, l, a, u] = results;
        this.programs = p;
        this.topics = t;
        this.terms = tm;
        this.lessons = l;
        this.assets = a;
        
        if (u && u.length > 0) {
          const userMap = new Map<string, User>();
          DEFAULT_USERS.forEach(user => userMap.set(user.email.toLowerCase(), user));
          u.forEach((user: User) => userMap.set(user.email.toLowerCase(), user));
          this.users = Array.from(userMap.values());
        }
        
        this.isInitialized = true;
      } catch (e) {
        this.initPromise = null;
        throw e;
      }
    })();

    return this.initPromise;
  }

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
    if (!termId) return [...this.lessons];
    return this.lessons
      .filter(l => l.term_id === termId)
      .sort((a, b) => a.lesson_number - b.lesson_number); 
  }
  getLesson(id: string) { return this.lessons.find(l => l.id === id); }
  getAssets(parentId: string) { return this.assets.filter(a => a.parent_id === parentId); }
  getUsers() { return [...this.users]; }
  
  getUserByEmail(email: string) { 
    if (!email) return undefined;
    const cleanEmail = email.toLowerCase().trim();
    return this.users.find(u => u.email.toLowerCase().trim() === cleanEmail); 
  }
  
  async createUser(user: Omit<User, 'id'>) {
    const id = generateId();
    const newUser = { ...user, id, email: user.email.toLowerCase().trim() } as User;
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      this.users.push(newUser);
      return newUser;
    }
    throw new Error('Failed to create user on server');
  }

  async updateUser(user: User) {
    const res = await fetch(`${API_BASE}/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (res.ok) {
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx !== -1) this.users[idx] = user;
    } else {
      throw new Error('Failed to update user on server');
    }
  }

  async deleteUser(userId: string) {
    const res = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      this.users = this.users.filter(u => u.id !== userId);
    } else {
      throw new Error('Failed to delete user on server');
    }
  }

  async createProgram(program: Partial<Program>) {
    const id = generateId();
    const newProg = { 
      ...program, 
      id, 
      status: Status.DRAFT,
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      languages_available: program.languages_available || ['en'],
      topic_ids: program.topic_ids || []
    } as Program;
    
    const res = await fetch(`${API_BASE}/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProg)
    });
    
    if (res.ok) {
      this.programs.push(newProg);
      return newProg;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to create program on server');
  }

  async deleteProgram(id: string) {
    const res = await fetch(`${API_BASE}/programs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      this.programs = this.programs.filter(p => p.id !== id);
      this.terms = this.terms.filter(t => t.program_id !== id);
      const termIds = this.terms.filter(t => t.program_id === id).map(t => t.id);
      this.lessons = this.lessons.filter(l => !termIds.includes(l.term_id));
    } else {
      throw new Error('Failed to delete program on server');
    }
  }

  async createTerm(term: Partial<Term>) {
    const id = generateId();
    const newTerm = { ...term, id, created_at: new Date().toISOString() } as Term;
    const res = await fetch(`${API_BASE}/terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTerm)
    });
    if (res.ok) {
      this.terms.push(newTerm);
      return newTerm;
    }
    throw new Error('Failed to create term on server');
  }

  async deleteTerm(id: string) {
    const res = await fetch(`${API_BASE}/terms/${id}`, { method: 'DELETE' });
    if (res.ok) {
      this.terms = this.terms.filter(t => t.id !== id);
      this.lessons = this.lessons.filter(l => l.term_id !== id);
    } else {
      throw new Error('Failed to delete term on server');
    }
  }

  async createLesson(lesson: Partial<Lesson>) {
    const id = generateId();
    const newLesson = { 
        ...lesson, 
        id, 
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(),
        content_languages_available: lesson.content_languages_available || [],
        content_urls_by_language: lesson.content_urls_by_language || {},
        subtitle_languages: lesson.subtitle_languages || [],
        subtitle_urls_by_language: lesson.subtitle_urls_by_language || {}
    } as Lesson;
    const res = await fetch(`${API_BASE}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLesson)
    });
    if (res.ok) {
      this.lessons.push(newLesson);
      return newLesson;
    }
    throw new Error('Failed to create lesson on server');
  }

  async updateLesson(lesson: Lesson) {
    const updatedLesson = { ...lesson, updated_at: new Date().toISOString() };
    const res = await fetch(`${API_BASE}/lessons/${lesson.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedLesson)
    });
    if (res.ok) {
      const idx = this.lessons.findIndex(l => l.id === lesson.id);
      if (idx !== -1) this.lessons[idx] = updatedLesson;
    } else {
      throw new Error('Failed to update lesson on server');
    }
  }

  async deleteLesson(id: string) {
    const res = await fetch(`${API_BASE}/lessons/${id}`, { method: 'DELETE' });
    if (res.ok) {
      this.lessons = this.lessons.filter(l => l.id !== id);
    } else {
      throw new Error('Failed to delete lesson on server');
    }
  }

  async changePassword(userId: string, newPassword: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/users/${userId}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });
    if (res.ok) {
      const idx = this.users.findIndex(u => u.id === userId);
      if (idx !== -1) this.users[idx].password = newPassword;
      return true;
    }
    return false;
  }

  async upsertAsset(asset: Omit<Asset, 'id'>) {
    const id = generateId();
    const res = await fetch(`${API_BASE}/assets/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...asset, id })
    });
    if (res.ok) {
      this.assets = this.assets.filter(a => !(a.parent_id === asset.parent_id && a.language === asset.language && a.variant === asset.variant && a.asset_type === asset.asset_type));
      this.assets.push({ ...asset, id } as Asset);
    } else {
      throw new Error('Failed to upsert asset on server');
    }
  }

  async processScheduled() {
    this.isInitialized = false;
    this.initPromise = null;
    await this.init();
  }
}

export const db = new Database();
