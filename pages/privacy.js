import React from 'react';
import Head from 'next/head';

export default function Privacy() {
  return (
    <div>
      <Head>
        <title>Privacy Policy - WhisperMap</title>
        <meta name="description" content="WhisperMap privacy policy" />
      </Head>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
        
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Introduction</h2>
          <p className="mb-4">
            At WhisperMap, we take your privacy seriously. This Privacy Policy explains how we collect, 
            use, disclose, and safeguard your information when you use our service.
          </p>
          <p className="mb-4">
            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, 
            please do not access the application.
          </p>
          
          <h2 className="text-2xl font-bold mb-4 mt-8">Information We Collect</h2>
          <p className="mb-4">
            We collect information that you provide directly to us when using our service:
          </p>
          <ul className="list-disc pl-8 mb-4">
            <li>Audio recordings that you create and share</li>
            <li>Location data when you record and share audio</li>
            <li>Usage data and analytics</li>
          </ul>
          
          <h2 className="text-2xl font-bold mb-4 mt-8">How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-8 mb-4">
            <li>Provide, maintain, and improve our services</li>
            <li>Display your shared audio recordings to other users</li>
            <li>Monitor and analyze usage patterns and trends</li>
          </ul>
          
          <h2 className="text-2xl font-bold mb-4 mt-8">Contact Us</h2>
          <p className="mb-4">
            If you have questions or concerns about this Privacy Policy, please contact us at:
          </p>
          <p className="mb-4">
            info@whispermap.com
          </p>
        </div>
      </div>
    </div>
  );
} 