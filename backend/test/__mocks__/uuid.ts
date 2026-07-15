import * as crypto from 'crypto';

export const v4 = () => crypto.randomUUID();
export const v1 = () => crypto.randomUUID();
export const NIL = '00000000-0000-0000-0000-000000000000';
export default { v4, v1, NIL };
