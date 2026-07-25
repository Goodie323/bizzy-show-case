import os
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from jinja2 import Template
from weasyprint import HTML

# For S3 upload
import boto3

RECEIPT_BUCKET = os.getenv("S3_RECEIPT_BUCKET", "bizzy-receipts")
s3 = boto3.client("s3")

RECEIPT_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1a1a1a; background: #fff; }
        .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #25D366; border-radius: 12px; overflow: hidden; }
        .header { background: #25D366; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
        .stamp { position: absolute; top: 60px; right: 40px; transform: rotate(-12deg); 
                 border: 3px solid #25D366; color: #25D366; padding: 8px 20px; 
                 font-size: 22px; font-weight: bold; opacity: 0.6; border-radius: 4px; }
        .body { padding: 30px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; 
                        color: #25D366; font-weight: bold; margin-bottom: 10px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; 
                    border-bottom: 1px solid #f0f0f0; }
        .info-row:last-child { border-bottom: none; }
        .label { color: #666; font-size: 13px; }
        .value { font-weight: 600; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { text-align: left; padding: 12px; background: #f8f9fa; font-size: 12px; 
             text-transform: uppercase; color: #666; font-weight: 600; }
        td { padding: 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
        .total-row { background: #f8f9fa; font-weight: bold; font-size: 15px; }
        .total-row td { border-top: 2px solid #25D366; border-bottom: none; }
        .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; 
                  font-size: 11px; color: #888; }
        .qr { text-align: center; margin: 20px 0; }
        .qr-code { display: inline-block; width: 100px; height: 100px; 
                   background: #f0f0f0; border-radius: 8px; line-height: 100px; 
                   color: #999; font-size: 11px; }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <h1>🛒 BIZZY</h1>
            <p>{{ business_name }}</p>
        </div>
        
        <div class="stamp">PAID</div>
        
        <div class="body">
            <div class="section">
                <div class="section-title">Receipt Details</div>
                <div class="info-row">
                    <span class="label">Receipt #</span>
                    <span class="value">{{ receipt_id }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Date</span>
                    <span class="value">{{ date }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Reference</span>
                    <span class="value">{{ paystack_reference }}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Customer</div>
                <div class="info-row">
                    <span class="label">Phone</span>
                    <span class="value">{{ customer_phone }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Delivery Address</span>
                    <span class="value">{{ delivery_address }}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Order Items</div>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for item in items %}
                        <tr>
                            <td>
                                {{ item.product_name }}
                                {% if item.variant and item.variant != 'none' %}
                                    <br><small style="color:#888">{{ item.variant }}</small>
                                {% endif %}
                            </td>
                            <td>{{ item.quantity }}</td>
                            <td>₦{{ "{:,.0f}".format(item.unit_price) }}</td>
                            <td>₦{{ "{:,.0f}".format(item.total) }}</td>
                        </tr>
                        {% endfor %}
                        <tr class="total-row">
                            <td colspan="3">TOTAL</td>
                            <td>₦{{ "{:,.0f}".format(total_amount) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <div class="section-title">Payment Breakdown</div>
                <div class="info-row">
                    <span class="label">Subtotal</span>
                    <span class="value">₦{{ "{:,.0f}".format(total_amount) }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Paystack Fee</span>
                    <span class="value">₦{{ "{:,.0f}".format(paystack_fee) }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Platform Fee (3%)</span>
                    <span class="value">₦{{ "{:,.0f}".format(platform_fee) }}</span>
                </div>
                <div class="info-row" style="border-top:2px solid #25D366; margin-top:10px; padding-top:10px;">
                    <span class="label" style="font-weight:bold;">Merchant Received</span>
                    <span class="value" style="color:#25D366; font-weight:bold;">
                        ₦{{ "{:,.0f}".format(merchant_gets) }}
                    </span>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for shopping with {{ business_name }}!</p>
            <p>Powered by Bizzy • {{ date }}</p>
            <p style="margin-top:10px; font-size:10px;">This is a computer-generated receipt.</p>
        </div>
    </div>
</body>
</html>
"""


def generate_receipt_pdf(
    db,
    order_id: int,
    paystack_fee: Decimal = Decimal("0"),
    platform_fee: Decimal = Decimal("0"),
    merchant_gets: Decimal = Decimal("0")
) -> Optional[str]:
    """
    Generate branded PDF receipt and upload to S3.
    Returns public URL.
    """
    from app.db.models import Order, Merchant
    
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        logger.error(f"Receipt generation: Order {order_id} not found")
        return None
    
    merchant = db.query(Merchant).filter(Merchant.id == order.merchant_id).first()
    
    template = Template(RECEIPT_HTML)
    html_content = template.render(
        business_name=merchant.business_name if merchant else "Bizzy Store",
        receipt_id=f"BIZ-{order.order_reference}",
        date=(order.confirmed_at or datetime.utcnow()).strftime("%B %d, %Y at %I:%M %p"),
        paystack_reference=order.paystack_reference or "N/A",
        customer_phone=order.customer_number,
        delivery_address=order.delivery_address or "Not provided",
        items=order.items_ordered,
        total_amount=float(order.total_amount),
        paystack_fee=float(paystack_fee),
        platform_fee=float(platform_fee),
        merchant_gets=float(merchant_gets)
    )
    
    # Generate PDF
    pdf_bytes = HTML(string=html_content).write_pdf()
    
    # Upload to S3
    filename = f"receipts/{merchant.id if merchant else 'unknown'}/{order.order_reference}.pdf"
    
    try:
        s3.put_object(
            Bucket=RECEIPT_BUCKET,
            Key=filename,
            Body=pdf_bytes,
            ContentType="application/pdf",
            ACL="public-read"
        )
        url = f"https://{RECEIPT_BUCKET}.s3.amazonaws.com/{filename}"
        
        # Update order
        order.receipt_url = url
        db.commit()
        
        return url
    except Exception as e:
        logger.error(f"Receipt S3 upload failed: {str(e)}")
        return None