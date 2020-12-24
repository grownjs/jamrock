// This file was automatically generated, do not modify.
import type { Model, ModelStatic, ModelInterface, ModelDefinition } from '@grown/model';
import type { User, Session, Token } from '../generated';
export * from '../generated';
import type { getRaw as UserInstanceMethodsGetRawModule } from './User/instanceMethods/getRaw';
import type { verify as UserClassMethodsVerifyModule } from './User/classMethods/verify';
import type { validateToken as UserClassMethodsValidateTokenModule } from './User/classMethods/validateToken';
import type { updatePassword as UserClassMethodsUpdatePasswordModule } from './User/classMethods/updatePassword';
import type { resetPassword as UserClassMethodsResetPasswordModule } from './User/classMethods/resetPassword';
import type { getUser as UserClassMethodsGetUserModule } from './User/classMethods/getUser';
import type { checkToken as SessionClassMethodsCheckTokenModule } from './Session/classMethods/checkToken';
import type { checkLogin as SessionClassMethodsCheckLoginModule } from './Session/classMethods/checkLogin';
import type { verify as TokenClassMethodsVerifyModule } from './Token/classMethods/verify';
import type { clear as TokenClassMethodsClearModule } from './Token/classMethods/clear';
import type { buildNew as TokenClassMethodsBuildNewModule } from './Token/classMethods/buildNew';
import type { verifyAndCreate as SessionClassMethodsVerifyAndCreateModule } from './Session/classMethods/verifyAndCreate';
import type { addUser as UserClassMethodsAddUserModule } from './User/classMethods/addUser';
interface TokenModule extends ModelDefinition {}
interface SessionModule extends ModelDefinition {}
interface UserModule extends ModelDefinition {}
export interface UserResource extends UserModule, ModelInterface {
  classMethods: UserClass.ClassMethods;
  instanceMethods: UserClass.InstanceMethods;
}
export namespace UserClass {
  export interface ClassMethods {
    addUser: typeof UserClassMethodsAddUserModule;
    getUser: typeof UserClassMethodsGetUserModule;
    resetPassword: typeof UserClassMethodsResetPasswordModule;
    updatePassword: typeof UserClassMethodsUpdatePasswordModule;
    validateToken: typeof UserClassMethodsValidateTokenModule;
    verify: typeof UserClassMethodsVerifyModule;
  }
  export interface InstanceMethods {
    getRaw: typeof UserInstanceMethodsGetRawModule;
  }
}
export interface SessionResource extends SessionModule, ModelInterface {
  classMethods: SessionClass.ClassMethods;
  instanceMethods: SessionClass.InstanceMethods;
}
export namespace SessionClass {
  export interface ClassMethods {
    verifyAndCreate: typeof SessionClassMethodsVerifyAndCreateModule;
    checkLogin: typeof SessionClassMethodsCheckLoginModule;
    checkToken: typeof SessionClassMethodsCheckTokenModule;
  }
  export interface InstanceMethods {}
}
export interface TokenResource extends TokenModule, ModelInterface {
  classMethods: TokenClass.ClassMethods;
  instanceMethods: TokenClass.InstanceMethods;
}
export namespace TokenClass {
  export interface ClassMethods {
    buildNew: typeof TokenClassMethodsBuildNewModule;
    clear: typeof TokenClassMethodsClearModule;
    verify: typeof TokenClassMethodsVerifyModule;
  }
  export interface InstanceMethods {}
}
export interface UserModel extends User, Model, UserClass.InstanceMethods {}
export interface SessionModel extends Session, Model, SessionClass.InstanceMethods {}
export interface TokenModel extends Token, Model, TokenClass.InstanceMethods {}
export type UserClass = ModelStatic<UserModel> & UserClass.ClassMethods;
export type SessionClass = ModelStatic<SessionModel> & SessionClass.ClassMethods;
export type TokenClass = ModelStatic<TokenModel> & TokenClass.ClassMethods;
/**
Found modules from `shared/database/models`
*/
export default interface Models {
  User: UserClass;
  Session: SessionClass;
  Token: TokenClass;
}
