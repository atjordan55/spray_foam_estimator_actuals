# Spray Foam Estimator

## Overview

The Spray Foam Estimator is a React-based web application designed to provide "Eco Innovations" with a client-side tool for accurately calculating spray foam insulation project costs and material requirements. It aims to streamline the quoting process, enhance accuracy, and integrate seamlessly with business operations for improved efficiency and customer satisfaction. The application supports detailed estimation, including various foam types, coating applications, and project-specific parameters, with a focus on delivering precise financial projections for insulation projects.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18.2 with Create React App (CRA)
- **Styling**: Tailwind CSS 3.x for utility-first styling with PostCSS and Autoprefixer
- **Entry Point**: `src/index.js` renders the main `SprayFoamEstimator` component from `App.jsx`

### Application Structure
- **Type**: Single Page Application with an Express backend for API and database interactions.
- **Routing**: Hash-based routing, with `/#/admin` for the admin console and default for the estimator.
- **Components**: Main estimator in `App.jsx`, admin console in `AdminConsole.jsx`.

### Admin Console
- **Access**: Password-protected via `/#/admin`.
- **Settings Storage**: Uses PostgreSQL `admin_settings` table to store configurable defaults and settings as JSONB.
- **Configurable Items**: Foam types (product details, cost, markup, container/usable gallons per set), coating types (calculation methods, container type, usable gallons/set, implied waste %, default $/sq ft), labor rates, project overheads (travel, waste, equipment), commission tier thresholds and rates, and company details. Waste is embedded in usable-gallons-per-set rather than a separate factor.
- **Estimator Integration**: Provides default settings to the estimator, with fallbacks to hardcoded values if API fetch fails.
- **Job Cost Markups**: Features independent markup fields for fuel, waste disposal, and equipment rental.

### Core Features
- **Project Area Management**: Supports named areas, multiple foam applications per area, and shared area properties (Sq Ft, Length, Width, Area Type, Roof Pitch).
- **Foam & Coating Calculations**: Detailed calculations for R-value, gallons, sets, and costs based on foam/coating types and thickness.
- **Dynamic Pricing**: Editable price per square foot with validation, impacting material markup.
- **Customer & Project Details**: Fields for customer information, project notes, estimate dates, and an auto-populated estimate name.
- **Financial Features**: Includes discount and deposit functionalities that integrate with overall profit calculations and Jobber synchronization.
- **Sales Commission**: Tiered commission structure based on profit margin thresholds.
- **Actual vs. Estimated Comparison**: Allows input of actual project values (labor, materials, fuel, waste, equipment) and displays a side-by-side comparison with color-coded variances.
- **Usability**: Features such as input validation, tooltips, recent estimates storage, print/PDF export, and a reset function.
- **Responsiveness**: Optimized layout for various devices (tablets, phones).

## External Dependencies

- **react / react-dom**: UI rendering.
- **react-scripts**: Build tooling for Create React App.
- **tailwindcss / postcss / autoprefixer**: Styling and CSS processing.
- **Jobber API**: GraphQL API for OAuth 2.0 authenticated integration, client management, property management, and quote creation.
  - **Line Item Mapping**: Maps estimated materials and labor to Jobber quote line items, with dynamic descriptions based on foam and area types.
  - **Client & Quote Management**: Improved client matching (email, phone), creation of new clients, and synchronization of discounts and deposits to Jobber quotes.
- **PostgreSQL**: Database for storing OAuth tokens and admin settings.
- **Vercel**: Deployment platform.