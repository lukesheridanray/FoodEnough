"""add ANI tables and is_premium column

Revision ID: 004
Revises: 003
Create Date: 2026-02-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_premium", sa.Integer(), server_default="1", nullable=True))

    op.create_table(
        "ani_recalibrations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("period_end", sa.DateTime(), nullable=False),
        sa.Column("prev_calorie_goal", sa.Integer(), nullable=False),
        sa.Column("prev_protein_goal", sa.Integer(), nullable=False),
        sa.Column("prev_carbs_goal", sa.Integer(), nullable=False),
        sa.Column("prev_fat_goal", sa.Integer(), nullable=False),
        sa.Column("new_calorie_goal", sa.Integer(), nullable=False),
        sa.Column("new_protein_goal", sa.Integer(), nullable=False),
        sa.Column("new_carbs_goal", sa.Integer(), nullable=False),
        sa.Column("new_fat_goal", sa.Integer(), nullable=False),
        sa.Column("analysis_json", sa.Text(), nullable=True),
        sa.Column("reasoning", sa.Text(), nullable=False),
    )

    op.create_table(
        "ani_insights",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("recalibration_id", sa.Integer(), sa.ForeignKey("ani_recalibrations.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("insight_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("ani_insights")
    op.drop_table("ani_recalibrations")
    op.drop_column("users", "is_premium")
