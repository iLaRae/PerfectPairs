import React from 'react';

const RestaurantSpecials = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Section */}
      <div className="flex flex-col lg:flex-row justify-center items-stretch py-8 lg:py-16 px-4 lg:px-0">
        {/* Lunch Specials Image */}
        <div className="flex-1 flex justify-center items-center p-4">
          {/* This div simulates the image of the pizza and drink */}
          <div className="relative w-full max-w-lg aspect-w-16 aspect-h-9 sm:aspect-h-7 md:aspect-h-9 lg:aspect-h-7 bg-cover bg-center" style={{ backgroundImage: 'url("/Beer-Spirits.png")' /* Replace with actual pizza image URL */ }}>
            <div className="absolute inset-0 bg-red-700 bg-opacity-75 flex items-end justify-start p-4 md:p-8">
              <h2 className="text-white text-3xl md:text-5xl font-extrabold tracking-tight">LUNCH<br/>SPECIALS</h2>
            </div>
          </div>
        </div>

        {/* Lunch Specials Text */}
        <div className="flex-1 p-4 lg:p-8 flex flex-col justify-center max-w-lg lg:max-w-none mx-auto">
          <h3 className="text-red-700 text-sm font-semibold mb-2 tracking-widest">LUNCH SPECIALS: 11AM-3PM</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            Make the most of your lunch break by spending it at Big Peperroni! Come enjoy a lunch special that will have you at the edge of your seat and more. Our lunch specials are a great way to enjoy excellent food and drinks. The lunch specials are available from 11 AM - 3 PM. You can choose from our amazing deals on meals that are perfect for a quick bite. Our lunch specials include a slice of our famous pizza or our mini calzone, 1/2 lg. Peperroni or our mini salad and the part of your day!
          </p>
        </div>
      </div>

      {/* Middle Section (Happy Hour) */}
      <div className="flex flex-col lg:flex-row justify-center items-stretch py-8 lg:py-16 px-4 lg:px-0">
        {/* Happy Hour Text */}
        <div className="flex-1 p-4 lg:p-8 flex flex-col justify-center order-2 lg:order-1 max-w-lg lg:max-w-none mx-auto">
          <h3 className="text-red-700 text-sm font-semibold mb-2 tracking-widest">HAPPY HOUR: 2PM-5PM</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            The only time to leave the work behind that can't be found is during Big Peperroni's Happy Hour! In addition, we also provide special hours you can't miss a part of your day. We also have happy hour deals from 2 PM to 5 PM every day of the week. We have specials you've never known, along with our food, drinks and beer on tap! We also have our own and incredible boccalis, try Big Peperroni Happy Hour. Buy Peperroni for everyone.
          </p>
        </div>

        {/* Happy Hour Image */}
        <div className="flex-1 flex justify-center items-center p-4 order-1 lg:order-2">
          {/* This div simulates the image of the beers */}
          <div className="relative w-full max-w-lg aspect-w-16 aspect-h-9 sm:aspect-h-7 md:aspect-h-9 lg:aspect-h-7 bg-cover bg-center" style={{ backgroundImage: 'url("https://i.imgur.com/your-beers-image.jpg")' /* Replace with actual beer image URL */ }}>
            <div className="absolute inset-0 bg-red-700 bg-opacity-75 flex items-end justify-start p-4 md:p-8">
              <h2 className="text-white text-3xl md:text-5xl font-extrabold tracking-tight">HAPPY<br/>HOUR</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Section */}
      <div className="bg-gray-800 py-8 px-4 text-white">
        <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between">
          <div className="mb-6 lg:mb-0 lg:w-1/2 text-center lg:text-left">
            <h3 className="text-red-500 text-lg font-semibold mb-2 tracking-widest">SPREADING LOVE FOR A CAUSE!</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Feel your heart connect with ours as we help those with
              food and open arms. Our goal is to bring meals,
              comfort, and a sense of belonging to those facing
              difficulty. We believe in the power of giving, and your
              support allows us to make a difference in people's lives.
              Join us in spreading love and food. Because everyone
              deserves a helping hand.
            </p>
            <button className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 text-xs tracking-wider uppercase rounded">
              RESERVE YOUR HOME HERE
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-end lg:w-1/2 space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Image 1 for footer */}
            <div className="w-48 h-32 bg-gray-600 flex items-center justify-center text-gray-400 text-xs">
              {/* Replace with actual image */}
              <img src="https://i.imgur.com/your-footer-image1.jpg" alt="Footer item 1" className="object-cover w-full h-full" />
            </div>
            {/* Image 2 for footer */}
            <div className="w-48 h-32 bg-gray-600 flex items-center justify-center text-gray-400 text-xs">
              {/* Replace with actual image */}
              <img src="https://i.imgur.com/your-footer-image2.jpg" alt="Footer item 2" className="object-cover w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantSpecials;