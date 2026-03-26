# Instructions for Claude in VS Code

## What You Have

You have an AlignSpecDB React app (Vite + Supabase). The user wants to change the
vehicle selection in the form from free-text inputs to **cascading dropdowns** that
are populated from a real vehicle database.

## Files Added

Two new files have been added to the project:

### 1. `src/vehicle-data.json` (3MB)
A JSON lookup file with this structure:
```json
{
  "Acura": {
    "CL": {
      "2003": [
        { "trim": "3.2L", "tire_sizes": "205/60R16" },
        { "trim": "3.2L S", "tire_sizes": "215/50R17" }
      ],
      "2002": [...]
    },
    "ILX": { ... }
  },
  "BMW": { ... }
}
```

Hierarchy: **Make → Model → Year → Trim[]** (each trim includes tire_sizes)

- 68 makes, 1,533 models, years 1950-2026, 53,574 total vehicle/trim entries
- Makes are sorted alphabetically, years sorted newest-first
- This file should be imported and used for the cascading dropdown logic

### 2. `vehicle-data.csv` (clean CSV, 53,574 rows)
Same data in CSV format for importing into Supabase later if needed.
Columns: year, make, model, trim, tire_sizes

### 3. `supabase-vehicles-setup.sql`
SQL to create a `vehicles` table in Supabase. Optional — only needed if they
want to query vehicles from the database instead of the bundled JSON.

## Changes Required to `src/App.jsx`

### Remove the hardcoded COMMON_MAKES array
Replace it with data from vehicle-data.json.

### Add the vehicle-data.json import
```javascript
import vehicleData from './vehicle-data.json';
```

### Implement cascading dropdown logic in the Form

The vehicle selection should work like this:

1. **Make dropdown** — Shows all 68 makes from the JSON keys
2. **Model dropdown** — Disabled until Make is selected. Shows models for that make.
3. **Year dropdown** — Disabled until Model is selected. Shows years for that make+model, sorted newest first.
4. **Trim dropdown** — Disabled until Year is selected. Shows trims for that make+model+year.
5. When a Trim is selected, **auto-populate tire_sizes** into the notes or a new field.

Each dropdown should filter the next one. If the user changes Make, reset Model/Year/Trim.
If they change Model, reset Year/Trim. And so on.

### Example implementation for the cascading logic:

```javascript
// Derive dropdown options from selections
const makes = Object.keys(vehicleData).sort();

const models = spec.make && vehicleData[spec.make]
  ? Object.keys(vehicleData[spec.make]).sort()
  : [];

const years = spec.make && spec.model && vehicleData[spec.make]?.[spec.model]
  ? Object.keys(vehicleData[spec.make][spec.model]).sort((a, b) => b - a)
  : [];

const trims = spec.make && spec.model && spec.year
    && vehicleData[spec.make]?.[spec.model]?.[spec.year]
  ? vehicleData[spec.make][spec.model][spec.year]
  : [];
```

### Reset logic when parent changes:

```javascript
const handleMakeChange = (make) => {
  setSpec(prev => ({ ...prev, make, model: '', year: '', trim: '' }));
};

const handleModelChange = (model) => {
  setSpec(prev => ({ ...prev, model, year: '', trim: '' }));
};

const handleYearChange = (year) => {
  setSpec(prev => ({ ...prev, year, trim: '' }));
};

const handleTrimChange = (trimValue) => {
  const trimData = trims.find(t => t.trim === trimValue);
  setSpec(prev => ({
    ...prev,
    trim: trimValue,
    // Optionally auto-fill tire info into notes
    notes: trimData?.tire_sizes
      ? `OEM Tire: ${trimData.tire_sizes}${prev.notes ? '\n' + prev.notes : ''}`
      : prev.notes
  }));
};
```

### Update the form section in FormView

Replace the current Make/Model/Year/Trim inputs with:

```jsx
{/* Make */}
<div>
  <label style={labelStyle}>Make *</label>
  <select value={spec.make} onChange={(e) => handleMakeChange(e.target.value)}
    style={selectStyle}>
    <option value="">Select Make</option>
    {makes.map(m => <option key={m} value={m}>{m}</option>)}
  </select>
</div>

{/* Model */}
<div>
  <label style={labelStyle}>Model *</label>
  <select value={spec.model} onChange={(e) => handleModelChange(e.target.value)}
    disabled={!spec.make} style={selectStyle}>
    <option value="">{spec.make ? 'Select Model' : 'Select Make first'}</option>
    {models.map(m => <option key={m} value={m}>{m}</option>)}
  </select>
</div>

{/* Year */}
<div>
  <label style={labelStyle}>Year *</label>
  <select value={spec.year} onChange={(e) => handleYearChange(e.target.value)}
    disabled={!spec.model} style={selectStyle}>
    <option value="">{spec.model ? 'Select Year' : 'Select Model first'}</option>
    {years.map(y => <option key={y} value={y}>{y}</option>)}
  </select>
</div>

{/* Trim */}
<div>
  <label style={labelStyle}>Trim</label>
  <select value={spec.trim} onChange={(e) => handleTrimChange(e.target.value)}
    disabled={!spec.year} style={selectStyle}>
    <option value="">{spec.year ? 'Select Trim' : 'Select Year first'}</option>
    {trims.map(t => <option key={t.trim} value={t.trim}>{t.trim}</option>)}
  </select>
</div>
```

### Also keep an "Other" option
Allow the user to type a custom value if their vehicle isn't in the database.
Add a toggle or a last option like "— Not listed (type manually) —" that switches
to a text input.

### Styling for disabled selects
```javascript
const selectStyle = {
  ...inputStyle,
  cursor: spec.make ? 'pointer' : 'not-allowed',
  opacity: 1, // keep readable even when disabled
};
```

## Database changes (optional, for later)

If the team later wants to search/query vehicles from Supabase instead of the
bundled JSON:

1. Run `supabase-vehicles-setup.sql` in the Supabase SQL Editor
2. In Supabase dashboard, go to Table Editor → `vehicles` table → Import → upload `vehicle-data.csv`
3. Change the dropdown code to fetch from Supabase instead of the JSON import

This is not needed right now — the JSON approach is faster and simpler to start with.
