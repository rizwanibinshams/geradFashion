# GeradFashion 

![GeradFashion Banner](public/assets/images/banner.png)

## Overview

GeradFashion is a full-featured e-commerce platform built with Node.js and MongoDB, offering a seamless shopping experience for fashion enthusiasts. This project demonstrates modern web development practices with a focus on security, performance, and user experience.

## Live Demo

- [Live Website] (https://geradfashion.shop/)


## Key Features

### Customer Features
- User authentication and profile management
- Shopping cart and wishlist functionality
- Secure payment integration
- Advanced product search and filtering
- Responsive design for all devices
- Email notifications for orders
- Product reviews and ratings

### Admin Features
- Comprehensive dashboard
- Product and inventory management
- Customer management
- Sales analytics and reporting
- Order processing and tracking
- Category and offer management
- Revenue analytics

## Technical Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose

### Frontend
- EJS (Embedded JavaScript)
- Tailwind CSS
- JavaScript

### Authentication & Security
- Passport.js
- bcrypt
- JWT
- Express-session

### Additional Tools
- Multer (File uploads)
- Nodemailer (Email services)
- Excel.js (Report generation)
- Chart.js (Analytics visualization)

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/rizwanibinshams/geradfashion.git
   cd geradfashion
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a .env file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_uri
   SESSION_SECRET=your_session_secret
   EMAIL_USER=your_email
   EMAIL_PASS=your_email_password
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_SECRET=your_razorpay_secret
   ```

4. **Start the Server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## Project Structure

```
geradfashion/
├── config/             # Configuration files
├── controllers/        # Request handlers
├── middlewares/       # Custom middlewares
├── models/            # Database models
├── public/            # Static files
│   ├── css/
│   ├── js/
│   └── images/
├── routes/            # API routes
├── views/             # EJS templates
├── helpers/           # Utility functions
└── app.js            # Entry point
```

## Security Features

- Secure password hashing
- Session management
- CSRF protection
- Input validation
- XSS prevention
- Rate limiting
- Secure payment handling

## Responsive Design

- Mobile-first approach
- Tablet & desktop optimized
- Cross-browser compatibility
- Progressive enhancement

## Performance Optimizations

- Image optimization
- Caching strategies
- Lazy loading
- Minified assets
- Database indexing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Muhammed Rizwan**
- GitHub: [@rizwanibinshams](https://github.com/rizwanibinshams)
- LinkedIn: www.linkedin.com/in/muhammedrizwanp

## Acknowledgments

- Brototype for the guidance and support
- All contributors who helped in the development
- Open source community for the amazing tools

---

 If you found this project helpful, please give it a star!
