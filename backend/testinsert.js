/*
  testInsert.js — inserts test rows for your mock PLAT tickets so you can
  verify the Documentation Fields section works in the dashboard modal.
 
  Run: node testInsert.js
  Then open any of PLAT-1 through PLAT-3 in the dashboard to see it working.
*/
const { initDB, upsertMetadata, getMetadata } = require('./database');
 
const TEST_TICKETS = [
  {
    id    : 'PLAT-1',
    fields: {
      docs_status        : 'Ready for Review',
      docs_to_change     : 'OAuth Login Guide, API Auth Docs',
      rn_writeup         : 'Fixed an issue where the OAuth redirect was failing on login.',
      notes              : 'Affects all users using SSO login.',
      docs_team_member   : 'Abbie',
      sme                : 'Cole Iliff',
      review_process     : 'Cleared',
      docs_changes_noted : 'Yes',
      wrike_card_added   : 'Yes',
      include_rn_sheet   : 'Public',
      entered_into_rn    : 'Yes',
      plat_link_added    : 'N/A',
    },
  },
  {
    id    : 'PLAT-2',
    fields: {
      docs_status        : 'In Progress',
      docs_to_change     : 'Dashboard Overview Page',
      rn_writeup         : 'Added new analytics widgets to the main dashboard.',
      notes              : 'Needs screenshot updates in docs.',
      docs_team_member   : 'Mark',
      sme                : 'Michael Caron',
      review_process     : 'Pending',
      docs_changes_noted : 'Yes',
      wrike_card_added   : 'No',
      include_rn_sheet   : 'Internal',
      entered_into_rn    : 'No',
      plat_link_added    : 'N/A',
    },
  },
  {
    id    : 'PLAT-3',
    fields: {
      docs_status        : 'Done',
      docs_to_change     : 'N/A',
      rn_writeup         : null,
      notes              : 'No customer-facing changes.',
      docs_team_member   : 'Abbie',
      sme                : 'N/A',
      review_process     : 'Cleared',
      docs_changes_noted : 'N/A',
      wrike_card_added   : 'N/A',
      include_rn_sheet   : 'Hidden',
      entered_into_rn    : 'N/A',
      plat_link_added    : 'N/A',
    },
  },
];
 
async function main() {
  await initDB();
 
  TEST_TICKETS.forEach(({ id, fields }) => {
    upsertMetadata(id, fields);
    const row = getMetadata(id);
    console.log(`✅ Inserted: ${id} | Status: ${row.docs_status} | RN: ${row.include_rn_sheet}`);
  });
 
  console.log('\n🎉 Done! Open PLAT-1, PLAT-2, or PLAT-3 in your dashboard');
  console.log('   Scroll to the bottom of the modal to see Documentation Fields.\n');
}
 
main().catch(err => { console.error('Error:', err.message); process.exit(1); });