import React from 'react';

export default function PrivacyPolicy() {
  const lastUpdated = "September 1, 2026";
  const appName = "Bizzy Digital Hub";
  const contactEmail = "support@bizzy.app"; // Replace with your support email

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-gray-800 font-sans leading-relaxed">
      <h1 className="text-3xl font-bold mb-2">{appName} — Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: {lastUpdated}</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">1. Introduction</h2>
        <p>
          Welcome to {appName} ("we," "our," or "us"). We provide an AI-powered WhatsApp automated sales assistant 
          and business management platform for merchants and consumers. This Privacy Policy explains how we collect, use, 
          disclose, and safeguard your information when you interact with our platform, website, or WhatsApp messaging service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">2. Information We Collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>WhatsApp Interaction Data:</strong> When you message a business powered by {appName} on WhatsApp, we collect 
            your WhatsApp phone number, profile display name, and the text content of your incoming messages to process orders 
            and support inquiries.
          </li>
          <li>
            <strong>Merchant Account Information:</strong> For merchants using our portal, we collect business display names, 
            email addresses, phone number IDs, catalog items, and payment setup details.
          </li>
          <li>
            <strong>Transaction Records:</strong> Metadata associated with digital receipts, sales logs, and payment link confirmations.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">3. How We Use Your Information</h2>
        <p className="mb-3">We process collected data exclusively for the following purposes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Facilitating real-time automated chat responses and order generation via WhatsApp.</li>
          <li>Generating digital receipts and tracking merchant inventory balances.</li>
          <li>Processing webhook payload events delivered through Meta’s Cloud API infrastructure.</li>
          <li>Improving performance and ensuring security of our platform engines.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">4. Third-Party Data Processing & Infrastructure</h2>
        <p className="mb-3">
          We do not sell, rent, or trade personal data. Data is processed securely through trusted infrastructure providers:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Meta Cloud API:</strong> Inbound and outbound WhatsApp messages are routed securely through Meta’s platform infrastructure.
          </li>
          <li>
            <strong>Artificial Intelligence Models:</strong> Text prompts are processed via large language model APIs (Google Gemini) 
            strictly to formulate automated conversation replies and contextual catalog searches.
          </li>
          <li>
            <strong>Cloud Hosting & Storage:</strong> Server infrastructure and encrypted relational database systems hosted on secure cloud providers (Render/PostgreSQL).
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">5. Data Retention & Deletion Rights</h2>
        <p>
          We retain message logs and transaction records only for as long as necessary to fulfill service operations and accounting requirements. 
          Users may request deletion of their personal information or merchant records at any time by contacting us at{" "}
          <a href={`mailto:${contactEmail}`} className="text-blue-600 underline">
            {contactEmail}
          </a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">6. Contact Us</h2>
        <p>
          If you have questions regarding this Privacy Policy or data practices, please reach out to us at:
        </p>
        <p className="mt-2 font-medium">
          {appName} Support Team<br />
          Email: <a href={`mailto:${contactEmail}`} className="text-blue-600 underline">{contactEmail}</a>
        </p>
      </section>
    </div>
  );
}