import axios from 'axios';

async function testPain() {
  try {
    const response = await axios.post('http://localhost:3000/api/webhook', 
      'Body=I have severe stomach pain&From=whatsapp:+919548534044', 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    console.log('Status:', response.status);
    console.log('Data:', response.data);
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
    }
  }
}

testPain();
