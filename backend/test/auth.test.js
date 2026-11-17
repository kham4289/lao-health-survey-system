import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword,verifyPassword,validateUser,sessionToken,requireRole } from '../src/auth.js';

test('passwords use independent salts and only the correct password verifies',async()=>{
 const first=await hashPassword('long-passphrase-123');
 const second=await hashPassword('long-passphrase-123');
 assert.notEqual(first,second);
 assert.equal(await verifyPassword('long-passphrase-123',first),true);
 assert.equal(await verifyPassword('incorrect-passphrase',first),false);
});
test('new accounts reject weak passwords and unknown roles',()=>{
 const user={name:'Demo User',email:'demo@example.test',password:'long-passphrase-123',role:'viewer'};
 assert.equal(validateUser(user),null);
 for(const invalid of [{password:'short'},{password:'x'.repeat(129)},{role:'superuser'},{email:'invalid'},{name:' '}]) assert.ok(validateUser({...user,...invalid}));
});
test('sessions accept only a full random token and role checks deny missing permissions',()=>{
 const token='a'.repeat(64);
 assert.equal(sessionToken({headers:{cookie:`other=1; health_session=${token}`}}),token);
 assert.equal(sessionToken({headers:{cookie:'health_session=invalid'}}),null);
 let denied=false,allowed=false;
 const res={status(code){assert.equal(code,403);return this;},json(){denied=true;}};
 requireRole('admin')({user:{role:'viewer'}},res,()=>{allowed=true;});
 assert.equal(denied,true);assert.equal(allowed,false);
});
