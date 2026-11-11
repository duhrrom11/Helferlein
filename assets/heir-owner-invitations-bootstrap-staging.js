/* Intentionally inert: no live endpoint or token may be configured by this file.
 * A future reviewed integration may explicitly mount with trusted dependencies. */
document.addEventListener('DOMContentLoaded', () => {
  const host=document.getElementById('heirOwnerInvitationStaging');
  if(host && window.HeirOwnerInvitationsStaging)
    window.HeirOwnerInvitationsStaging.mount(host,{enabled:false});
},{once:true});
