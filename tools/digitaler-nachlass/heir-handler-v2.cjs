'use strict';
// Offline composition only. This module never starts a server or creates a DB
// connection. Auth client and pg Pool must be injected by a trusted server.
const {readHeirEnvelope}=require('./heir-read-api-v2.cjs');
const {createTransactionalHeirRepository}=require('./heir-transaction-v2.cjs');
function createHeirReadHandler({auth,pool}={}){
 if(!auth||typeof auth.getUser!=='function')throw new TypeError('invalid_auth_client');
 const repository=createTransactionalHeirRepository(pool);
 return request=>readHeirEnvelope(request,{auth,repository});
}
module.exports={createHeirReadHandler};
