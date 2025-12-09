#!/bin/bash

echo "========================================="
echo "Razorpay Keys Update Script"
echo "========================================="
echo ""
echo "Current Razorpay Keys:"
grep "RAZORPAY_" .env
echo ""
echo "To update your keys, run these commands:"
echo ""
echo "sed -i '' 's/RAZORPAY_KEY_ID=.*/RAZORPAY_KEY_ID=YOUR_NEW_KEY_ID/' .env"
echo "sed -i '' 's/RAZORPAY_KEY_SECRET=.*/RAZORPAY_KEY_SECRET=YOUR_NEW_KEY_SECRET/' .env"
echo ""
echo "Or manually edit .env file and update:"
echo "  RAZORPAY_KEY_ID=your_new_key_id"
echo "  RAZORPAY_KEY_SECRET=your_new_key_secret"
echo ""
echo "========================================="

