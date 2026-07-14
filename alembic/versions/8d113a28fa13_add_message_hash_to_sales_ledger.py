"""add_message_hash_to_sales_ledger

Revision ID: 8d113a28fa13
Revises: cca83471e0a2
Create Date: 2026-07-14 14:56:24.281148

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d113a28fa13'
down_revision: Union[str, Sequence[str], None] = 'cca83471e0a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add message_hash column to sales_ledger table
    op.add_column(
        'sales_ledger', 
        sa.Column('message_hash', sa.String(), nullable=True)  # Note: nullable (two 'l's), NOT nulllable (three 'l's)
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove message_hash column if rolled back
    op.drop_column('sales_ledger', 'message_hash')