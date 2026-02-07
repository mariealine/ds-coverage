// Sample file with Tailwind hardcoded values for testing
import { Button } from "@company/ui";

export function Card() {
  return (
    <div className="bg-gray-100 text-sm font-medium rounded-lg shadow-md p-4">
      <h2 className="text-blue-600 text-xl font-bold">Title</h2>
      <p className="text-gray-500">Description</p>
      {/* @ds-migrate: simple | Replace bg-gray-100 with semantic token */}
      {/* @ds-migrate: complex | Custom card should use <Card> from DS. Risks: layout changes. Cost: ~1h */}
      {/* @ds-todo: Create <StatusBadge> component */}
      <Button variant="primary">Click me</Button>
    </div>
  );
}
