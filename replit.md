# Spray Foam Estimator

## Overview

A React-based web application for estimating spray foam insulation projects. Built with Create React App and styled with Tailwind CSS. The application is designed as a client-side estimator tool for "Eco Innovations" to help calculate spray foam insulation costs and requirements.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18.2 with Create React App (CRA) as the build toolchain
- **Styling**: Tailwind CSS 3.x for utility-first CSS styling
- **CSS Processing**: PostCSS with Autoprefixer for browser compatibility
- **Entry Point**: `src/index.js` renders the main `SprayFoamEstimator` component from `App.jsx`

### Application Structure
- **Single Page Application**: Client-side only React app with no backend
- **Component Structure**: Main application component is `SprayFoamEstimator` in `App.jsx`
- **Development Server**: Runs on port 5000 with host check disabled for Replit compatibility

### Build Configuration
- **Tailwind Content Paths**: Configured to scan `src/**/*.{js,jsx,ts,tsx}` and `public/index.html`
- **PostCSS Plugins**: Tailwind CSS and Autoprefixer enabled

## Recent Changes

### Usability Improvements (Latest)
- **Customer Information Section**: Added fields for customer name, phone, email, and address
- **Customer Name as Estimate Name**: Customer name auto-populates the estimate name field if empty
- **Date Fields**: Estimate Date and Valid Until (expiration) date fields with 30-day default validity
- **Project Notes**: Text area for special instructions, job site conditions, or other notes
- **Print/PDF Export**: Print button that opens browser print dialog for PDF generation
- **Reset Button**: Clear all fields and start a new estimate with confirmation dialog
- **Input Validation**: All numeric inputs prevent negative values
- **Tooltips**: Helpful info icons next to all fields explaining their purpose
- **Recent Estimates**: Last 10 estimates stored in browser for quick access
- **Comparison View**: Toggle to show side-by-side Estimated vs Actual comparison table
- **Mobile Responsive**: Optimized layout for tablets and phones

### Project Areas Improvements
- **Area (Sq Ft) Field**: New editable field to enter known square footage directly
- **Optional Length/Width**: Length and Width fields are now optional - only needed if calculating from dimensions
- **Smart Calculation**: Uses Area (Sq Ft) if provided; otherwise calculates from Length × Width
- **Area Type Adjustments**: Roof Deck pitch multiplier and Gable half-area only apply when using Length × Width calculation
- **Apply Pitch to Manual Area**: Checkbox option for Roof Deck areas to apply pitch multiplier even when entering Area (Sq Ft) directly

### Sales Commission Logic
- Sales commission is now calculated based on profit margin thresholds:
  - 10% of net profit at 30–34.99% profit margin
  - 12% of net profit at ≥35% profit margin
  - No commission below 30% margin
- Removed manual sales commission percentage input and checkbox

### Actual Results Input
- Actual fields (Labor Hours, Open Cell Gallons, Closed Cell Gallons) now default to estimated values
- Added "Labor and Material Confirmed" checkbox
- Red warning text "Please confirm that actuals are correct" displays until checkbox is checked
- Sales Commission field added to Actual Results section with same tiered logic

### Charged Labor Rate
- Made editable (requires Actual Labor Rate to be filled first)
- Two-way sync with Labor Markup percentage

## External Dependencies

### Core Dependencies
- **react / react-dom**: ^18.2.0 - UI rendering library
- **react-scripts**: 5.0.1 - Create React App build tooling

### Styling Dependencies
- **tailwindcss**: ^3.0.0 - Utility-first CSS framework
- **postcss**: ^8.4.0 - CSS transformation tool
- **autoprefixer**: ^10.4.0 - Adds vendor prefixes to CSS

### External Services
- None currently configured - this is a standalone client-side application