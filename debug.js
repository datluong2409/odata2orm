const parser = require('odata-v4-parser');

// Test different OData syntax
console.log('Testing OData parser...\n');

try {
  console.log('1. substringof test:');
  const result1 = parser.filter("substringof('John', Name)");
  console.log(JSON.stringify(result1, null, 2));
} catch (e) {
  console.log('substringof failed:', e.message);
}

try {
  console.log('\n2. contains test:');
  const result2 = parser.filter("contains(Name, 'John')");
  console.log(JSON.stringify(result2, null, 2));
} catch (e) {
  console.log('contains failed:', e.message);
}

try {
  console.log('\n3. startswith test:');
  const result3 = parser.filter("startswith(Name, 'John')");
  console.log(JSON.stringify(result3, null, 2));
} catch (e) {
  console.log('startswith failed:', e.message);
}
