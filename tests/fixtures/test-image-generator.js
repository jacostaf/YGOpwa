/**
 * Test image fixture generator for ImageManager testing
 * Creates various test images for different scenarios
 */

import { createCanvas } from 'canvas';
import fs from 'fs/promises';
import path from 'path';

export async function createTestImageFixtures() {
  const fixturesDir = path.join(process.cwd(), 'tests/fixtures/test-images');
  
  try {
    await fs.access(fixturesDir);
  } catch {
    await fs.mkdir(fixturesDir, { recursive: true });
  }

  // Create test card image (standard Yu-Gi-Oh card dimensions)
  await createTestCardImage(fixturesDir, 'test-card-1.png', 421, 614, '#4A90E2');
  
  // Create small test image
  await createTestCardImage(fixturesDir, 'test-card-small.png', 100, 145, '#E24A4A');
  
  // Create large test image
  await createTestCardImage(fixturesDir, 'test-card-large.png', 842, 1228, '#4AE24A');
  
  // Create invalid/corrupted image file
  await fs.writeFile(path.join(fixturesDir, 'corrupted.png'), 'not-an-image');
  
  console.log('Test image fixtures created successfully');
}

async function createTestCardImage(dir, filename, width, height, color) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill with color
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  
  // Add border
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);
  
  // Add text
  ctx.fillStyle = 'white';
  ctx.font = `${Math.floor(height * 0.1)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TEST CARD', width / 2, height / 2);
  ctx.fillText(`${width}x${height}`, width / 2, height / 2 + height * 0.15);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(path.join(dir, filename), buffer);
}