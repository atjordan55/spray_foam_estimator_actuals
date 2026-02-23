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
- **Named Areas**: Each project area can be given a descriptive name (e.g., "Exterior Walls", "Roof Deck")
- **Multiple Foam Applications**: Each area supports multiple foam types (e.g., 2" closed cell + 5" open cell)
- **Shared Area Properties**: Area Sq Ft, Length, Width, Area Type, and Roof Pitch are shared across all foam applications in an area
- **Per-Foam Properties**: Each foam application has its own Foam Type, Thickness, Material Price, Markup, and Board Feet per Set
- **R-Value Calculations**: Automatically calculated based on foam type and thickness (Closed Cell: 7.2/inch, Open Cell: 3.8/inch)
- **Effective Area Display**: Shows calculated effective square footage including pitch multiplier or triangular area calculation
- **Add/Remove Foam Types**: Button to add additional foam applications to any area
- **Per-Application Output**: Each foam application shows its own material calculations (Sq Ft, R-Value, Gallons, Sets, Costs)
- **Area Summary**: When multiple foam types exist in an area, displays combined totals (Sq Ft, Total R-Value, Open/Closed Cell gallons and sets, Base Cost, Markup, Total)
- **Area (Sq Ft) Field**: Editable field to enter known square footage directly
- **Mutual Exclusivity**: Area (Sq Ft) and Length/Width are mutually exclusive - entering one disables/clears the other
- **Length/Width Disabled**: When Area (Sq Ft) > 0, Length and Width fields are greyed out and blank
- **Area Resets**: When Length or Width > 0, Area (Sq Ft) resets to 0
- **Apply Pitch to Manual Area**: Checkbox only visible when Area Type is Roof Deck AND Area (Sq Ft) > 0
- **Editable $/Sq Ft**: Can directly edit price per square foot - updates Material Markup (%) and $/Per Set accordingly
- **$/Sq Ft Validation**: Cannot be lower than minimum derived from Material Cost per Set (shows error message)
- **Legacy Data Migration**: Automatically converts old single-foam area data to new multi-foam structure when loading

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

### Discount Feature
- **Discount ($)**: Dollar amount input for discounting the total job cost
- **Discount (%)**: Percentage input that syncs bidirectionally with dollar amount
- **Sales Price**: Displayed in Estimate Summary before discount (renamed from Total Job Cost)
- **Customer Charge**: Calculated as Sales Price minus discount
- **Visual Display**: Discount shown in green when applied
- **Profit Calculations**: All profit margins and commissions calculated from discounted Customer Charge
- **Reset Integration**: Discount values cleared when resetting estimate
- **Jobber Sync**: Discount percentage sent to Jobber quote's discount field when creating quotes

### Deposit Feature
- **Deposit ($)**: Dollar amount input for the required deposit on the customer charge
- **Deposit (%)**: Percentage input that syncs bidirectionally with dollar amount
- **Based on Customer Charge**: Deposit percentage calculated from the discounted Customer Charge amount
- **Jobber Sync**: Deposit percentage sent to Jobber quote's deposit field when creating quotes
- **Reset Integration**: Deposit values cleared when resetting estimate
- **Save/Load**: Deposit values persisted in saved estimate files with backwards compatibility

### Actual Results Enhancements
- **New Input Fields**: Added Actual Fuel Cost, Actual Waste Disposal, Actual Equipment Rental inputs (default to Project Parameters values)
- **Color-Coded Comparisons**:
  - Actual Material Cost: Green if lower than estimated, red if higher, black if same
  - Actual Labor Cost: Green if lower than estimated, red if higher, black if same
  - Actual Base Job Cost: Bold green if lower, bold red if higher, bold black if same
- **Complete Output Display**: Actual Results section now includes all outputs from Estimate Summary:
  - Actual Material Cost, Actual Labor Cost, Actual Fuel Cost, Actual Waste Disposal, Actual Equipment Rental
  - Actual Base Job Cost, Material Markup, Labor Markup, Sales Price, Discount, Customer Charge
  - Actual Job Net Profit, Sales Commission, Total Fees, Final Actual Profit
- **Styling Updates**: Base Material Cost and Base Labor Cost now use non-bold, non-highlighted black text in Estimate Summary

## External Dependencies

### Core Dependencies
- **react / react-dom**: ^18.2.0 - UI rendering library
- **react-scripts**: 5.0.1 - Create React App build tooling

### Styling Dependencies
- **tailwindcss**: ^3.0.0 - Utility-first CSS framework
- **postcss**: ^8.4.0 - CSS transformation tool
- **autoprefixer**: ^10.4.0 - Adds vendor prefixes to CSS

### Jobber Integration
- **OAuth 2.0 Authentication**: Connect to Jobber via OAuth flow
- **Client Management**: Search for existing clients by email/phone/name, create new clients if not found
- **Property Management**: Automatically retrieve or create properties for clients
- **Quote Creation**: Send estimates to Jobber as quotes with line items
- **Line Item Mapping**:
  - Material line items: Area Name + Foam Type + Thickness, Quantity = Sq Ft, Unit Price = $/Sq Ft
  - Labor line item: "Complete Spray Foam Insulation Solution" with full-service description
- **Dynamic Descriptions**: Area Type + Foam Type combinations generate specific descriptions:
  - Exterior Walls + Closed Cell: Thermal barrier, moisture seal, structural enhancement
  - Exterior Walls + Open Cell: Air seal, sound deadening, thermal resistance
  - Roof Deck + Closed Cell: Air seal, moisture barrier, thermal resistance
  - Roof Deck + Open Cell: Air seal, sound deadening, thermal resistance
- **Token Storage**: PostgreSQL database stores OAuth tokens with automatic refresh

### Area Types
- General Area: Standard rectangular area calculation
- Exterior Walls: Wall cavities with specific insulation descriptions
- Roof Deck: Roof areas with pitch multiplier option
- Gable: Triangular area calculation (0.5 × length × width)

### External Services
- **Jobber API**: GraphQL API (version 2025-04-16) for quote and client management
- **PostgreSQL**: Database for OAuth token storage
- **Deployment**: Vercel at https://spray-foam-estimator.vercel.app
- **Jobber Redirect URI**: https://spray-foam-estimator.vercel.app/api/auth/jobber/callback

### Recent Jobber Integration Updates
- **Improved Client Matching**: Searches by exact email match first, then normalized phone number - no more fuzzy name matching
- **Lead Source**: Set to blank when creating new clients (not auto-filled with app name)
- **Labor Line Item**: Includes base labor, markup, fuel cost, waste disposal, and equipment rental
- **Price Consistency**: $/Sq Ft rounded to 2 decimals, total calculated from rounded value to match Jobber quotes
- **Default Closed Cell Markup**: 66.67% (results in $2.30/sq ft at 2" thickness)
- **Default Open Cell Markup**: 76.77% (results in $1.70/sq ft at 6" thickness)