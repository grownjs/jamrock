import PocketBase from 'pocketbase';

export const pb = new PocketBase(process.env.PB_ADMIN_URL || 'http://127.0.0.1:8090');

export const connect = (email, password) => pb.admins.authWithPassword(email, password);

try {
  if (process.env.NODE_ENV === 'production') {
    await connect(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASSWORD);
  }
} catch (e) {
  console.log('E_PB', e);
}

export class Model {
  static buildParams(obj) {
    const out = [];
    Object.keys(obj).forEach(k => {
      out.push(`${k}=${JSON.stringify(obj[k])}`);
    });
    return out.join(',');
  }

  static get self() {
    return pb.collection(this.table);
  }

  static async findAll({ where = {} } = {}) {
    const fields = Model.buildParams(where);
    const records = await this.self.getList(fields);
    return records;
  }

  static async findOne({ where = {} } = {}) {
    try {
      const fields = Model.buildParams(where);
      const record = await this.self.getFirstListItem(fields);
      return record;
    } catch (e) {
      if (e.status !== 404) throw e;
      return null;
    }
  }

  static async create(data) {
    const record = await this.self.create(data);
    return record;
  }

  static async update({ data, where = {} }) {
    const found = await this.findOne({ where });
    const record = await this.self.update(found.id, data);
    return record;
  }

  static async delete({ where = {} } = {}) {
    const found = await this.findOne({ where });
    const result = await this.self.delete(found.id);
    return result;
  }
}

export class User extends Model {
  static table = 'users';

  static async addUser({ email, resend, verified, password = 'Password.123' }) {
    const user = await this.create({ email, verified, password, passwordConfirm: password, emailVisibility: true });

    let pending;
    if (resend !== false && !user.verified) {
      pending = await this.self.requestVerification(email);
    }
    return { user, pending };
  }

  static async verifyAuth({ email, password, exception }) {
    try {
      const auth = await this.self.authWithPassword(email, password);
      return auth;
    } catch (e) {
      if (exception || e.status !== 400) throw e;
      return null;
    }
  }
}
