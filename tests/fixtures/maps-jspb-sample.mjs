function makeBusiness() {
  const inner = [];
  inner[2] = ['12 MG Road', 'Bangalore, KA'];
  inner[4] = [];
  inner[4][2] = 'moderate';
  inner[4][3] = ['https://reviews.example.test', '248 reviews'];
  inner[4][7] = 4.6;
  inner[4][8] = 248;
  inner[7] = ['https://smiledesk.example', 'smiledesk.example'];
  inner[9] = [null, null, 12.9716, 77.5946];
  inner[10] = '0x1111111111111111:0x2222222222222222';
  inner[11] = 'Smile Desk Dental';
  inner[13] = ['Dental clinic', 'Dentist'];
  inner[18] = 'Smile Desk Dental, 12 MG Road, Bangalore';
  inner[39] = '12 MG Road, Bangalore, Karnataka 560001';
  inner[57] = [null, 'Smile Desk Dental owner', 'owner-1'];
  inner[76] = [['dental_clinic', 'Dental clinic', 2]];
  inner[78] = 'ChIJ-test-place';
  inner[82] = [null, 'MG Road'];
  inner[89] = '/g/testkg';
  inner[166] = 'Bangalore';
  inner[178] = [['080 5555 1212', [['8055551212', 1], ['+91 80 5555 1212', 2]], null, '8055551212', null, ['tel:8055551212']]];
  inner[183] = [null, [null, null, null, null, '560001', 'Karnataka']];
  inner[203] = [[['Monday', 1, [2026, 9, 1], [['9 AM-6 PM', [[9, 0], [18, 0]]]]]], [null, null, null, null, ['Open until 6 PM'], null, null, null, ['Open']]];
  inner[243] = 'IN';
  return [null, inner];
}

const fixture = ['root', ['branch', makeBusiness(), ['nested', makeBusiness()]]];
export default fixture;

export const appStateFixture = { bootstrap: ")]}'\n" + JSON.stringify(fixture).padEnd(1200, ' ') };
