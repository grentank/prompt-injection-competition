const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const PORT = process.env.PORT || 4100;

app.listen(PORT, () => {
  console.log(`PIC sandbox listening on :${PORT} [${process.env.INSTANCE_ID || 'local'}]`);
});
