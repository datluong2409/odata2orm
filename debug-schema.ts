/**
 * Debug script to check schema map
 */

import { z } from 'zod';
import { SchemaValidator } from './src/utils/schema-validator';

const TestSchema = z.object({
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
    status: z.string(),
    items: z.array(z.object({
      name: z.string(),
      price: z.number()
    }))
  }))
});

const validator = new SchemaValidator(TestSchema);

// Access private schemaMap for debugging
const schemaMap = (validator as any).schemaMap;

console.log('Schema Map:');
console.log(JSON.stringify(schemaMap, null, 2));

console.log('\nTesting paths:');
console.log('profile/avatar:', validator.validateFieldPath(['profile', 'avatar']));
console.log('profile/bio:', validator.validateFieldPath(['profile', 'bio']));
console.log('orders:', validator.validateFieldPath(['orders']));
console.log('orders/total:', validator.validateFieldPath(['orders', 'total']));
