import http from 'http';

const fetchDashboard = () => new Promise((resolve, reject) => {
  http.get('http://localhost:5000/api/dashboard', { headers: { 'Authorization': 'Bearer test-token' } }, (res) => { // we need a valid token though!
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  }).on('error', reject);
});
