import { execSync } from 'child_process';
import path from 'path';

console.log('====================================================');
console.log('      Running OWASP ZAP DAST Security Scan           ');
console.log('====================================================');

const TARGET_URL = process.env.ZAP_TARGET_URL || 'http://localhost:8000/health';
const REPORT_NAME = 'zap-report.html';
const WORK_DIR = process.cwd();

console.log(`Target URL: ${TARGET_URL}`);
console.log(`Report location: ${path.join(WORK_DIR, REPORT_NAME)}`);
console.log('\nChecking Docker availability...');

try {
  // Check if docker is installed and running
  execSync('docker info', { stdio: 'ignore' });
  console.log('Docker is running. Starting OWASP ZAP Baseline Scan...');

  // ZAP Baseline Scan CLI command mapping host.docker.internal for local address
  // Use host.docker.internal if target is localhost so container can resolve host port
  const resolvedTarget = TARGET_URL.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
  
  const dockerCmd = `docker run --rm -v "${WORK_DIR}:/zap/wrk/:rw" -t zaproxy/zap-stable zap-baseline.py -t ${resolvedTarget} -r ${REPORT_NAME}`;
  
  console.log(`Executing Command:\n${dockerCmd}\n`);
  
  execSync(dockerCmd, { stdio: 'inherit' });
  
  console.log('\nScan completed successfully! Report generated.');
} catch (error) {
  console.warn('\n[!] OWASP ZAP scan execution failed or Docker is not available.');
  console.log('\nTo run the security tests manually with OWASP ZAP:');
  console.log('----------------------------------------------------');
  console.log('1. Ensure Docker is running.');
  console.log('2. Ensure the LinkPulse server is running locally on port 8000.');
  console.log('3. Run the following Docker command to scan the health check API:');
  console.log(`   docker run --rm -v "${WORK_DIR}:/zap/wrk/:rw" -t zaproxy/zap-stable zap-baseline.py -t http://host.docker.internal:8000/health -r ${REPORT_NAME}`);
  console.log('4. Open the generated file "zap-report.html" in your browser to view vulnerabilities.');
  console.log('----------------------------------------------------');
}
