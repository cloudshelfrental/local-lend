# Local Lend

Create a complete business web application called "Cloud Shelf".

Tagline: "It's Your Next Shelf"

Concept:

Cloud Shelf is a hyperlocal personal rental platform where customers can rent items from nearby owners. The system should support location-based visibility, delivery workflow, payment management, and wallet settlements.

Use a modern responsive UI suitable for mobile and desktop.

User Roles:

1. Super Admin

2. Admin

3. Owner

4. Customer

5. Delivery Staff

LOCATION SYSTEM

Create a hierarchical location system:

State

District

Panchayath

Ward

Admin should be able to create Panchayaths and define a Ward Count.

Example:

Panchayath: Kuttanellur

Ward Count: 25

The system must automatically generate Ward 1 to Ward 25.

Create an Area system where Admin can group multiple Panchayaths under a single Area.

Example:

Area: Thrissur East

Panchayaths: Kuttanellur, Ollur, Nadathara, Koorkenchery

When a Panchayath belongs to an Area, all users in that Panchayath automatically belong to that Area.

CUSTOMER REGISTRATION

Customer signup fields:

Name

Mobile Number

State

District

Panchayath

Ward

Area should automatically assign based on Panchayath.

Customer login should be only with mobile number.

No OTP authentication required.

Customers should only see rental items from owners within the same Area.

OWNER REGISTRATION

Owner signup fields:

Name

Mobile Number

State

District

Panchayath

Ward

Area must automatically assign based on Panchayath.

Owner dashboard must include:

Profile

My Items

Orders

Wallet

Earnings

Delivery Options

DELIVERY STAFF REGISTRATION

Delivery staff fields:

Name

Mobile Number

Assigned Area

Delivery staff should only receive delivery orders from their assigned Area.

ITEM LISTING SYSTEM

Owners can list rental items with:

Item Name

Category

Description

Rental Price

Security Deposit

Stock Quantity

Payment Type

Payment Type options:

Pre Payment

Post Payment

Owner must upload at least 3 images for every item.

Images can be uploaded as file or via Image URL.

System should not allow publishing item with less than 3 images.

ITEM AVAILABILITY LOGIC

If stock becomes zero:

Show badge "Currently Rented Out".

If item will return soon:

Show badge "Available in X Hours".

CUSTOMER ITEM DISPLAY

Customer UI should display:

Item Images

Owner Name

Rental Price

Platform Commission

Delivery Charge

Total Price

Availability Badge

Customers should only see items from owners within the same Area.

PLATFORM COMMISSION

Super Admin can define platform commission percentage per item category.

Example:

Dress = 15%

Ornaments = 20%

Electronics = 10%

Customer price should be calculated as:

Customer Price = Owner Price + Platform Commission.

DELIVERY CHARGE

Admin can define a fixed delivery charge.

Example:

Delivery Charge = ₹80.

Delivery charge will be added to every order.

Delivery charge earnings go to delivery staff wallet when order is completed.

ORDER WORKFLOW

Order process:

Customer places order

Owner receives order request

Owner accepts order

Owner selects delivery option:

Self Delivery

Delivery Staff

DELIVERY STAFF BROADCAST SYSTEM

If owner selects Delivery Staff:

The order should be broadcast to all delivery staff registered in the same Area.

Delivery staff dashboard should show:

"New Delivery Order Available".

The first delivery staff who clicks "Accept Order" gets the order.

The order should immediately disappear from other delivery staff dashboards.

DELIVERY PROCESS

Delivery workflow:

Pickup item from Owner

Deliver item to Customer

Pickup item from Customer after rental period

Return item to Owner

Order statuses:

Order Created

Owner Accepted

Pickup Scheduled

Picked from Owner

Delivered to Customer

Rental Active

Return Requested

Picked from Customer

Returned to Owner

Order Completed

PAYMENT SYSTEM

Payment depends on owner selected payment type.

If Pre Payment:

Customer must pay full amount before delivery.

Payment includes:

Rental price

Platform commission

Delivery charge

Security deposit (if applicable)

After customer payment:

Order status becomes "Waiting for Admin Confirmation".

Admin verifies payment.

Delivery starts only after Admin confirmation.

If Post Payment:

Customer pays when item is delivered.

Delivery staff collects payment.

Collected payment is recorded in Delivery Staff Collection Wallet.

WALLET SYSTEM

Create wallet systems for Owners and Delivery Staff.

Owner Wallet should show:

Pending Earnings

Settled Earnings

Withdrawable Balance

Transaction History

Delivery Staff Wallet should show:

Delivery Charges Earned

Collected Payments

Pending Settlement

Settlement History

ADMIN SETTLEMENT SYSTEM

Admin should review payments and collections.

After admin settlement:

Owner wallet is credited with rental earnings.

Delivery staff collection balance is deducted.

Platform commission goes to admin account.

ADMIN DASHBOARD

Admin dashboard must include:

Order Management

Owner Management

Delivery Staff Management

Area Management

Payment Monitoring

Settlement Control

Item Monitoring

SUPER ADMIN PANEL

Super Admin should control:

States

Districts

Panchayaths

Ward Counts

Area Creation

Platform Commission

Platform Analytics

Admin Accounts

SYSTEM GOAL

The system must support a scalable hyperlocal rental marketplace model where items are rented between nearby users with delivery support, wallet-based settlements, and admin-controlled payments.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/58c8cfde-b6ee-4b71-b854-a703ba35a5e1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
cloud shelf 06/08/26
anas monkk
penny info
cloud shelf
penny info -delivery ok
samrambhaka
