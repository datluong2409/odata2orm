/**
 * Example demonstrating schema validation error throwing
 */

import { z } from 'zod';
import { buildPrismaPagination, SchemaValidationError } from '../dist';

// Define a schema for a User entity
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  profile: z.object({
    avatar: z.string().optional(),
    bio: z.string().optional(),
    address: z.object({
      city: z.string(),
      country: z.string()
    })
  }),
  orders: z.array(z.object({
    id: z.string(),
    total: z.number(),
    status: z.string()
  }))
});

console.log('=== Schema Validation Error Throwing Example ===\n');

// Example 1: Valid query - no errors
console.log('1. Valid query:');
try {
  const result = buildPrismaPagination(
    {
      $filter: "name eq 'John' and profile/address/city eq 'New York'",
      $select: "id,name,profile(avatar,bio),orders(total,status)",
      $orderby: "name asc, profile/bio desc",
      $top: 10
    },
    {
      schema: UserSchema,
      allowAllFields: false  // Enable strict validation
    }
  );
  console.log('✅ Success - query built successfully');
  console.log('Find query keys:', Object.keys(result.findQuery));
} catch (error) {
  console.log('❌ Unexpected error:', (error as Error).message);
}

console.log('\n2. Invalid field in $filter:');
try {
  buildPrismaPagination(
    {
      $filter: "invalidField eq 'test'"
    },
    {
      schema: UserSchema,
      allowAllFields: false
    }
  );
  console.log('❌ Should have thrown an error');
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.log('✅ Caught SchemaValidationError:');
    console.log(`   Field: ${error.field}`);
    console.log(`   Operation: ${error.operation}`);
    console.log(`   Message: ${error.message}`);
  } else {
    console.log('❌ Unexpected error type:', (error as Error).message);
  }
}

console.log('\n3. Invalid field in $select:');
try {
  buildPrismaPagination(
    {
      $select: "id,invalidField"
    },
    {
      schema: UserSchema,
      allowAllFields: false
    }
  );
  console.log('❌ Should have thrown an error');
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.log('✅ Caught SchemaValidationError:');
    console.log(`   Field: ${error.field}`);
    console.log(`   Operation: ${error.operation}`);
  } else {
    console.log('❌ Unexpected error type:', (error as Error).message);
  }
}

console.log('\n4. Invalid nested field in $select:');
try {
  buildPrismaPagination(
    {
      $select: "id,profile(invalidNestedField)"
    },
    {
      schema: UserSchema,
      allowAllFields: false
    }
  );
  console.log('❌ Should have thrown an error');
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.log('✅ Caught SchemaValidationError:');
    console.log(`   Field: ${error.field}`);
    console.log(`   Operation: ${error.operation}`);
  } else {
    console.log('❌ Unexpected error type:', (error as Error).message);
  }
}

console.log('\n5. Invalid field in $orderby:');
try {
  buildPrismaPagination(
    {
      $orderby: "invalidField desc"
    },
    {
      schema: UserSchema,
      allowAllFields: false
    }
  );
  console.log('❌ Should have thrown an error');
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.log('✅ Caught SchemaValidationError:');
    console.log(`   Field: ${error.field}`);
    console.log(`   Operation: ${error.operation}`);
  } else {
    console.log('❌ Unexpected error type:', (error as Error).message);
  }
}

console.log('\n6. Invalid collection filter:');
try {
  buildPrismaPagination(
    {
      $filter: "invalidCollection/any(o: o/total gt 100)"
    },
    {
      schema: UserSchema,
      allowAllFields: false
    }
  );
  console.log('❌ Should have thrown an error');
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.log('✅ Caught SchemaValidationError:');
    console.log(`   Field: ${error.field}`);
    console.log(`   Operation: ${error.operation}`);
  } else {
    console.log('❌ Unexpected error type:', (error as Error).message);
  }
}

console.log('\n7. Using any/all on non-collection field:');
try {
  buildPrismaPagination(
    {
      $filter: "name/any(n: n eq 'test')"
    },
    {
      schema: UserSchema,
      allowAllFields: false
    }
  );
  console.log('❌ Should have thrown an error');
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.log('✅ Caught SchemaValidationError:');
    console.log(`   Field: ${error.field}`);
    console.log(`   Operation: ${error.operation}`);
    console.log(`   Message: ${error.message}`);
  } else {
    console.log('❌ Unexpected error type:', (error as Error).message);
  }
}

console.log('\n8. Permissive mode (allowAllFields: true) - should not throw:');
try {
  const result = buildPrismaPagination(
    {
      $filter: "anyInvalidField eq 'test'",
      $select: "id,anyField",
      $orderby: "anyField desc"
    },
    {
      schema: UserSchema,
      allowAllFields: true  // Permissive mode
    }
  );
  console.log('✅ Success - permissive mode allows any fields');
} catch (error) {
  console.log('❌ Unexpected error in permissive mode:', (error as Error).message);
}

console.log('\n=== Example completed ===');
