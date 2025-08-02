#!/usr/bin/env node

/**
 * Combined Coverage Report Generator
 * Merges Vitest JSDOM coverage with Browser test coverage for comprehensive metrics
 */

import fs from 'fs';
import path from 'path';

const UNIT_COVERAGE_DIR = './coverage-unit';
const BROWSER_COVERAGE_DIR = './coverage-browser';
const COVERAGE_DIR = './coverage';
const COMBINED_REPORT = './coverage/combined-report.html';

console.log('🔄 Merging coverage from JSDOM unit tests and browser tests...');

/**
 * Parse coverage data from coverage-final.json files
 */
function parseCoverageData(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;
    
    for (const file of Object.values(data)) {
      if (file.s) {
        totalStatements += Object.keys(file.s).length;
        coveredStatements += Object.values(file.s).filter(count => count > 0).length;
      }
      if (file.b) {
        totalBranches += Object.keys(file.b).length;
        coveredBranches += Object.values(file.b).filter(branches => 
          branches.some(count => count > 0)
        ).length;
      }
      if (file.f) {
        totalFunctions += Object.keys(file.f).length;
        coveredFunctions += Object.values(file.f).filter(count => count > 0).length;
      }
      if (file.statementMap) {
        totalLines += Object.keys(file.statementMap).length;
        if (file.s) {
          coveredLines += Object.values(file.s).filter(count => count > 0).length;
        }
      }
    }
    
    return {
      statements: { total: totalStatements, covered: coveredStatements },
      branches: { total: totalBranches, covered: coveredBranches },
      functions: { total: totalFunctions, covered: coveredFunctions },
      lines: { total: totalLines, covered: coveredLines }
    };
  } catch (error) {
    console.warn(`⚠️  Could not parse coverage data from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Merge two coverage data objects
 */
function mergeCoverageData(jsdomData, browserData) {
  if (!jsdomData && !browserData) return null;
  if (!jsdomData) return browserData;
  if (!browserData) return jsdomData;
  
  return {
    statements: {
      total: Math.max(jsdomData.statements.total, browserData.statements.total),
      covered: Math.max(jsdomData.statements.covered, browserData.statements.covered)
    },
    branches: {
      total: Math.max(jsdomData.branches.total, browserData.branches.total),
      covered: Math.max(jsdomData.branches.covered, browserData.branches.covered)
    },
    functions: {
      total: Math.max(jsdomData.functions.total, browserData.functions.total),
      covered: Math.max(jsdomData.functions.covered, browserData.functions.covered)
    },
    lines: {
      total: Math.max(jsdomData.lines.total, browserData.lines.total),
      covered: Math.max(jsdomData.lines.covered, browserData.lines.covered)
    }
  };
}

/**
 * Calculate percentage
 */
function getPercentage(covered, total) {
  return total > 0 ? ((covered / total) * 100).toFixed(2) : '0.00';
}

try {
  // Parse coverage data
  const jsdomCoverageFile = path.join(UNIT_COVERAGE_DIR, 'coverage-final.json');
  const browserCoverageFile = path.join(BROWSER_COVERAGE_DIR, 'coverage-final.json');
  
  console.log('📊 Parsing coverage data...');
  const jsdomData = parseCoverageData(jsdomCoverageFile);
  const browserData = parseCoverageData(browserCoverageFile);
  
  console.log(`   JSDOM Coverage: ${jsdomData ? '✅' : '❌'}`);
  console.log(`   Browser Coverage: ${browserData ? '✅' : '❌'}`);
  
  if (!jsdomData && !browserData) {
    throw new Error('No coverage data found. Run tests with coverage first.');
  }
  
  // Merge coverage data
  const combinedData = mergeCoverageData(jsdomData, browserData);
  
  // Calculate percentages
  const stmtPct = getPercentage(combinedData.statements.covered, combinedData.statements.total);
  const branchPct = getPercentage(combinedData.branches.covered, combinedData.branches.total);
  const funcPct = getPercentage(combinedData.functions.covered, combinedData.functions.total);
  const linesPct = getPercentage(combinedData.lines.covered, combinedData.lines.total);
  
  // Individual coverage for comparison
  const jsdomLinesPct = jsdomData ? getPercentage(jsdomData.lines.covered, jsdomData.lines.total) : '0.00';
  const browserLinesPct = browserData ? getPercentage(browserData.lines.covered, browserData.lines.total) : '0.00';
  
  // Generate combined HTML report
  const combinedHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Combined Test Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .success { background-color: #d4edda; border-color: #c3e6cb; }
        .info { background-color: #d1ecf1; border-color: #bee5eb; }
        .warning { background-color: #fff3cd; border-color: #ffeaa7; }
        .coverage-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .coverage-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .coverage-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .comparison-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .comparison-table th, .comparison-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .comparison-table th { background-color: #f8f9fa; font-weight: bold; }
        .high-coverage { color: #28a745; font-weight: bold; }
        .med-coverage { color: #ffc107; font-weight: bold; }
        .low-coverage { color: #dc3545; font-weight: bold; }
        iframe { width: 100%; height: 600px; border: 1px solid #ccc; border-radius: 5px; }
        .note { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 15px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Yu-Gi-Oh! PWA Combined Coverage Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p>Merged JSDOM Unit Tests + Browser Integration Tests</p>
    </div>
    
    <div class="section success">
        <h2>📊 Combined Coverage Metrics</h2>
        <div class="coverage-grid">
            <div class="coverage-card">
                <div class="coverage-number ${linesPct >= 75 ? 'high-coverage' : linesPct >= 50 ? 'med-coverage' : 'low-coverage'}">${linesPct}%</div>
                <div>Lines Coverage</div>
                <small>${combinedData.lines.covered}/${combinedData.lines.total} lines</small>
            </div>
            <div class="coverage-card">
                <div class="coverage-number ${stmtPct >= 75 ? 'high-coverage' : stmtPct >= 50 ? 'med-coverage' : 'low-coverage'}">${stmtPct}%</div>
                <div>Statements</div>
                <small>${combinedData.statements.covered}/${combinedData.statements.total} statements</small>
            </div>
            <div class="coverage-card">
                <div class="coverage-number ${branchPct >= 75 ? 'high-coverage' : branchPct >= 50 ? 'med-coverage' : 'low-coverage'}">${branchPct}%</div>
                <div>Branches</div>
                <small>${combinedData.branches.covered}/${combinedData.branches.total} branches</small>
            </div>
            <div class="coverage-card">
                <div class="coverage-number ${funcPct >= 75 ? 'high-coverage' : funcPct >= 50 ? 'med-coverage' : 'low-coverage'}">${funcPct}%</div>
                <div>Functions</div>
                <small>${combinedData.functions.covered}/${combinedData.functions.total} functions</small>
            </div>
        </div>
    </div>
    
    <div class="section info">
        <h2>🔍 Coverage Breakdown by Test Type</h2>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Test Environment</th>
                    <th>Lines Coverage</th>
                    <th>Purpose</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>JSDOM Unit Tests</strong></td>
                    <td class="${jsdomLinesPct >= 75 ? 'high-coverage' : jsdomLinesPct >= 50 ? 'med-coverage' : 'low-coverage'}">${jsdomLinesPct}%</td>
                    <td>Core logic, error handling, utilities</td>
                    <td>${jsdomData ? '✅ Available' : '❌ Not Run'}</td>
                </tr>
                <tr>
                    <td><strong>Browser Integration</strong></td>
                    <td class="${browserLinesPct >= 75 ? 'high-coverage' : browserLinesPct >= 50 ? 'med-coverage' : 'low-coverage'}">${browserLinesPct}%</td>
                    <td>Canvas, DOM APIs, ImageManager</td>
                    <td>${browserData ? '✅ Available' : '❌ Not Run'}</td>
                </tr>
                <tr>
                    <td><strong>Combined Total</strong></td>
                    <td class="${linesPct >= 75 ? 'high-coverage' : linesPct >= 50 ? 'med-coverage' : 'low-coverage'}">${linesPct}%</td>
                    <td>Comprehensive coverage</td>
                    <td>📊 Calculated</td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <div class="note">
        <h4>📋 Coverage Strategy Explained:</h4>
        <ul>
            <li><strong>JSDOM Tests:</strong> Fast unit tests for business logic, utilities, and error handling</li>
            <li><strong>Browser Tests:</strong> Real browser APIs for Canvas operations, ImageManager, DOM integration</li>
            <li><strong>Combined Approach:</strong> Maximizes coverage by using the best environment for each component</li>
            <li><strong>Target:</strong> 75% combined line coverage across all test environments</li>
        </ul>
    </div>
    
    ${jsdomData ? `
    <div class="section">
        <h2>📊 JSDOM Unit Test Coverage Details</h2>
        <p>Line-by-line coverage for core application logic</p>
        <iframe src="./lcov-report/index.html" title="JSDOM Unit Test Coverage"></iframe>
        <p><a href="./lcov-report/index.html" target="_blank">Open JSDOM Coverage in New Tab</a></p>
    </div>
    ` : ''}
    
    ${browserData ? `
    <div class="section">
        <h2>🌐 Browser Integration Test Coverage</h2>
        <p>Real browser environment coverage for ImageManager and DOM APIs</p>
        <iframe src="../coverage-browser/lcov-report/index.html" title="Browser Test Coverage"></iframe>
        <p><a href="../coverage-browser/lcov-report/index.html" target="_blank">Open Browser Coverage in New Tab</a></p>
    </div>
    ` : ''}
    
    <div class="section">
        <h2>📋 Available Commands</h2>
        <ul>
            <li><code>npm run test:coverage:unit</code> - Run JSDOM unit tests with coverage</li>
            <li><code>npm run test:imagemanager:coverage</code> - Run browser tests with coverage</li>
            <li><code>npm run coverage:merge</code> - Generate this combined report</li>
            <li><code>npm run test:coverage:all</code> - Run all tests and merge coverage</li>
        </ul>
    </div>
    
    <div class="section ${linesPct >= 75 ? 'success' : 'warning'}">
        <h2>🎯 Coverage Assessment</h2>
        <p><strong>Current Combined Coverage: ${linesPct}%</strong></p>
        <p><strong>Target Coverage: 75%</strong></p>
        ${linesPct >= 75 
          ? '<p class="high-coverage">🎉 Excellent! Coverage target achieved!</p>' 
          : `<p class="med-coverage">📈 Gap to target: ${(75 - parseFloat(linesPct)).toFixed(2)}%</p>`
        }
        <p><strong>Recommendation:</strong> ${linesPct >= 75 
          ? 'Maintain current coverage levels and add tests for new features.' 
          : 'Focus on adding tests for uncovered ImageManager methods and error handling paths.'
        }</p>
    </div>
</body>
</html>`;
  
  // Ensure coverage directory exists
  if (!fs.existsSync(COVERAGE_DIR)) {
    fs.mkdirSync(COVERAGE_DIR, { recursive: true });
  }
  
  // Write combined report
  fs.writeFileSync(COMBINED_REPORT, combinedHtml);
  
  console.log('\n✅ Combined coverage report generated successfully!');
  console.log('\n📊 Coverage Summary:');
  console.log(`   🎯 Combined Lines Coverage: ${linesPct}%`);
  console.log(`   📝 Statements: ${stmtPct}%`);
  console.log(`   🌿 Branches: ${branchPct}%`);
  console.log(`   ⚡ Functions: ${funcPct}%`);
  
  console.log('\n📋 Individual Test Results:');
  console.log(`   🔬 JSDOM Unit Tests: ${jsdomLinesPct}%`);
  console.log(`   🌐 Browser Integration: ${browserLinesPct}%`);
  
  console.log('\n📁 Available Reports:');
  console.log('   🎯 Combined Report: coverage/combined-report.html');
  if (jsdomData) console.log('   📊 JSDOM Details: coverage/lcov-report/index.html');
  if (browserData) console.log('   🌐 Browser Details: coverage-browser/lcov-report/index.html');
  
  // Summary for terminal
  console.log(`\n🏆 Target Status: ${linesPct >= 75 ? '✅ ACHIEVED' : '⚠️  NEEDS IMPROVEMENT'} (Target: 75%)`);
  
} catch (error) {
  console.error('❌ Error generating combined coverage report:', error.message);
  process.exit(1);
}