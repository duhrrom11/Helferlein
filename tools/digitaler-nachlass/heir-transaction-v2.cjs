'use strict';
// Server-only transactional wrapper. Inject a trusted pg Pool (connect()).
// The locked SELECT is performed within an explicit READ COMMITTED transaction.
// The authorization snapshot is linearized at SELECT; after COMMIT a revocation
// may happen. Already returned ciphertext cannot be retroactively revoked.
const {createHeirRepository}=require('./heir-repository-v2.cjs');
function createTransactionalHeirRepository(pool){
 if(!pool||typeof pool.connect!=='function')throw new TypeError('invalid_pool');
 return Object.freeze({async readAuthorizedEnvelopeSnapshot(identity){
  const client=await pool.connect();
  if(!client||typeof client.query!=='function'||typeof client.release!=='function') {
    if(client&&typeof client.release==='function')client.release();
    throw new TypeError('invalid_client');
  }
  let begun=false;
  let discardError=null;
  try{
   try { await client.query('BEGIN ISOLATION LEVEL READ COMMITTED'); }
   catch(error) { discardError=error; throw error; }
   begun=true;
   const snapshot=await createHeirRepository(client).readAuthorizedEnvelopeSnapshot(identity);
   await client.query('COMMIT');
   begun=false;
   return snapshot;
  }catch(error){
   if(begun){try{await client.query('ROLLBACK');}catch(rollbackError){discardError=rollbackError; /* preserve original error */}} 
   throw error;
  }finally{client.release(discardError || undefined);}
 }});
}
module.exports={createTransactionalHeirRepository};
