
import { 
  UUID, Status, Program, Topic, Term, Lesson, Asset, User, Role, 
  AssetVariant, AssetType, ContentType 
} from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);
const API_BASE = '/api';

class Database {
  private programs: Program[] = [];
  private topics: Topic[] = [];
  private terms: Term[] = [];
  private lessons: Lesson[] = [];
  private assets: Asset[] = [];
  private users: User[] = [];
  private isInitialized = false;

  async init() {
    try {
      const endpoints = ['programs', 'topics', 'terms', 'lessons', 'assets', 'users'];
      
      const results = await Promise.all(
        endpoints.map(async (ep) => {
          try {
            const res = await fetch(`${API_BASE}/${ep}`, {
              headers: { 'Accept': 'application/json' }
            });
            
            if (!res.ok) return [];
            
            const text = await res.text();
            if (!text || text.trim() === '') return [];
            
            try {
              const data = JSON.parse(text);
              return Array.isArray(data) ? data : [];
            } catch (parseError) {
              console.error(`Malformed JSON from ${ep}`);
              return [];
            }
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
      this.users = u;
      
      this.isInitialized = true;
    } catch (e) {
      console.error("Database init error:", e);
      this.programs = [];
      this.topics = [];
      this.terms = [];
      this.lessons = [];
      this.assets = [];
      this.users = [];
    }
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
    return this.users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim()); 
  }
  
  async createUser(user: Omit<User, 'id'>) {
    const id = generateId();
    const newUser = { ...user, id, email: user.email.toLowerCase().trim() } as User;
    await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(user: User) {
    await fetch(`${API_BASE}/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx !== -1) this.users[idx] = user;
  }

  async deleteUser(userId: string) {
    await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
    this.users = this.users.filter(u => u.id !== userId);
  }

  async createProgram(program: Partial<Program>) {
    const id = generateId();
    const newProg = { 
      ...program, 
      id, 
      status: Status.DRAFT,
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString()
    } as Program;
    await fetch(`${API_BASE}/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProg)
    });
    this.programs.push(newProg);
    return newProg;
  }

  async deleteProgram(id: string) {
    await fetch(`${API_BASE}/programs/${id}`, { method: 'DELETE' });
    this.programs = this.programs.filter(p => p.id !== id);
    this.terms = this.terms.filter(t => t.program_id !== id);
  }

  async createTerm(term: Partial<Term>) {
    const id = generateId();
    const newTerm = { ...term, id, created_at: new Date().toISOString() } as Term;
    await fetch(`${API_BASE}/terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTerm)
    });
    this.terms.push(newTerm);
    return newTerm;
  }

  async deleteTerm(id: string) {
    await fetch(`${API_BASE}/terms/${id}`, { method: 'DELETE' });
    this.terms = this.terms.filter(t => t.id !== id);
  }

  async createLesson(lesson: Partial<Lesson>) {
    const id = generateId();
    const newLesson = { 
        ...lesson, 
        id, 
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString()
    } as Lesson;
    await fetch(`${API_BASE}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLesson)
    });
    this.lessons.push(newLesson);
    return newLesson;
  }

  async updateLesson(lesson: Lesson) {
    const updatedLesson = { ...lesson, updated_at: new Date().toISOString() };
    await fetch(`${API_BASE}/lessons/${lesson.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedLesson)
    });
    const idx = this.lessons.findIndex(l => l.id === lesson.id);
    if (idx !== -1) this.lessons[idx] = updatedLesson;
  }

  async deleteLesson(id: string) {
    await fetch(`${API_BASE}/lessons/${id}`, { method: 'DELETE' });
    this.lessons = this.lessons.filter(l => l.id !== id);
  }

  async changePassword(userId: string, newPassword: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/users/${userId}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });
    if (response.ok) {
      const idx = this.users.findIndex(u => u.id === userId);
      if (idx !== -1) this.users[idx].password = newPassword;
      return true;
    }
    return false;
  }

  async upsertAsset(asset: Omit<Asset, 'id'>) {
    const id = generateId();
    await fetch(`${API_BASE}/assets/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...asset, id })
    });
    this.assets = this.assets.filter(a => !(a.parent_id === asset.parent_id && a.language === asset.language && a.variant === asset.variant && a.asset_type === asset.asset_type));
    this.assets.push({ ...asset, id } as Asset);
  }

  async processScheduled() {
    await this.init();
  }
}

export const db = new Database();
