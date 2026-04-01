import axios from 'axios';

async function getLogs() {
  try {
    const response = await axios.get('http://localhost:3000/api/webhook/logs');
    console.log(response.data);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

getLogs();
