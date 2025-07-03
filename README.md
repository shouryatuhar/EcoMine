# Ecomine - Carbon Footprint Management System

## Overview
Ecomine is a comprehensive web-based platform designed to help coal mines quantify, manage, and reduce their carbon footprint. The system utilizes machine learning algorithms and data analytics to provide personalized recommendations for carbon reduction strategies.

## Key Features
- Real-time carbon emission tracking
- Interactive data visualization
- Carbon credit marketplace
- User authentication system
- Admin dashboard
- Mobile-responsive design

## Technology Stack
- **Frontend**: HTML, CSS, JavaScript, EJS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT, bcrypt
- **Deployment**: Local server (Port 3001)

## Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start MongoDB:
   ```bash
   mongod --dbpath /path/to/data/db
   ```
4. Start the server:
   ```bash
   node main.js
   ```

## Project Structure
```
Ecomine/
├── public/          # Static files
├── views/           # EJS templates
├── routes/          # Route handlers
├── models/          # Database models
├── controllers/     # Business logic
└── main.js          # Entry point
```

## Features in Detail

### 1. Carbon Emission Tracking
- Real-time monitoring of emissions
- Historical data analysis
- Emission source categorization
- Automated calculations

### 2. Data Visualization
- Interactive charts and graphs
- Real-time updates
- Customizable dashboards
- Export capabilities

### 3. Carbon Credit Marketplace
- Buy and sell carbon credits
- Transparent pricing
- Secure transactions
- Credit tracking

### 4. User Management
- Secure authentication
- Role-based access
- Profile management
- Activity tracking

## Paris Agreement Compliance
Ecomine helps mining companies meet their Paris Agreement commitments by:
- Tracking and reducing carbon emissions
- Providing data-driven insights
- Enabling carbon credit trading
- Supporting sustainable practices

## Target Regions
Currently focused on major mining regions in India:
- Jharkhand (Dhanbad, Bokaro)
- Odisha (Talcher, Jharsuguda)
- Chhattisgarh (Korba, Raigarh)
- Andhra Pradesh (Singareni coal mines)
- Maharashtra (Chandrapur)
- West Bengal (Raniganj)

## Future Scope
- Mobile application development
- Advanced analytics integration
- Blockchain implementation
- AI-powered recommendations
- Expansion to other mining regions

## Contributing
Feel free to submit issues and enhancement requests!

## License
This project is licensed under the MIT License. 