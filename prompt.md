I need you to create a prompt for implementing a new feature. Here are examples of effective feature implementation prompts:

**EXAMPLE 1: Save/Delete Functionality Prompt**
Create a save and delete system for a prompt library application with the following requirements:

Technical Specifications:
- Save button that persists prompts to localStorage
- Delete button with confirmation dialog before removal
- Visual feedback on successful save (green checkmark animation)
- Trash icon with hover effect for delete action
- Auto-save indicator when changes are detected

Provide complete HTML, CSS, and JavaScript with:
1. Semantic HTML with data attributes for prompt IDs
2. CSS animations for save confirmation and delete hover states
3. JavaScript with proper event delegation for dynamically added prompts
4. localStorage integration with JSON serialization

The system should work with this data structure:
const prompts = [
  { id: 'prompt-001', title: "Blog Writer", content: "Generate blog posts...", savedAt: Date.now() }
];

Include error handling for localStorage quota exceeded and implement a "Recently Deleted" temporary storage (up to 5 items).

**EXAMPLE 2: Star Rating Component Prompt**
Build a 5-star rating system for rating prompt effectiveness with these specifications:

Core Requirements:
- Interactive 5-star display (click to rate, hover to preview)
- Half-star precision (4.5 stars possible)
- Shows average rating and total number of ratings
- Updates immediately without page refresh
- Allows users to change their rating

Implementation Details:
- SVG stars for crisp display at any size
- Gold fill for rated, gray outline for unrated
- Smooth hover animations (scale and glow effect)
- Display format: "4.5 ★ (23 ratings)"

Deliver production-ready code including:
1. HTML with accessible ARIA labels for screen readers
2. CSS with star animations and responsive sizing
3. JavaScript for rating logic and state management
4. Comments explaining calculation methods

Data model to support:
{
  promptId: 'prompt-001',
  ratings: [5, 4, 5, 3, 5], // Array of all ratings
  userRating: 4, // Current user's rating
  averageRating: 4.4
}

**YOUR TASK:** Based on the examples above, create a detailed prompt for building a "notes section" feature where users can add, edit, save, and delete notes for each prompt in the library.

The prompt should follow the pattern shown in the examples:

- Clear feature description
- Specific technical requirements
- Implementation details
- Expected deliverables
- Data structure/integration notes

Keep it as simple as possible to create a working notes section with only the features mentioned in your task.
