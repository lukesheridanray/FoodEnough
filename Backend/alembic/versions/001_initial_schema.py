"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-02-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("calorie_goal", sa.Integer(), nullable=True),
        sa.Column("protein_goal", sa.Integer(), nullable=True),
        sa.Column("carbs_goal", sa.Integer(), nullable=True),
        sa.Column("fat_goal", sa.Integer(), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("sex", sa.String(), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=True),
        sa.Column("activity_level", sa.String(), nullable=True),
        sa.Column("goal_type", sa.String(), nullable=True),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"])
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "food_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("input_text", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("calories", sa.Float(), nullable=True),
        sa.Column("protein", sa.Float(), nullable=True),
        sa.Column("carbs", sa.Float(), nullable=True),
        sa.Column("fat", sa.Float(), nullable=True),
        sa.Column("fiber", sa.Float(), nullable=True),
        sa.Column("sugar", sa.Float(), nullable=True),
        sa.Column("sodium", sa.Float(), nullable=True),
        sa.Column("parsed_json", sa.Text(), nullable=True),
    )
    op.create_index(op.f("ix_food_logs_id"), "food_logs", ["id"])
    op.create_index(op.f("ix_food_logs_user_id"), "food_logs", ["user_id"])
    op.create_index(op.f("ix_food_logs_timestamp"), "food_logs", ["timestamp"])

    op.create_table(
        "workouts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("exercises_json", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
    )
    op.create_index(op.f("ix_workouts_id"), "workouts", ["id"])
    op.create_index(op.f("ix_workouts_user_id"), "workouts", ["user_id"])

    op.create_table(
        "weight_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("weight_lbs", sa.Float(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
    )
    op.create_index(op.f("ix_weight_entries_id"), "weight_entries", ["id"])
    op.create_index(op.f("ix_weight_entries_user_id"), "weight_entries", ["user_id"])

    op.create_table(
        "fitness_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("gym_access", sa.String(), nullable=True),
        sa.Column("goal", sa.String(), nullable=True),
        sa.Column("experience_level", sa.String(), nullable=True),
        sa.Column("days_per_week", sa.Integer(), nullable=True),
        sa.Column("session_duration_minutes", sa.Integer(), nullable=True),
        sa.Column("limitations", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_fitness_profiles_id"), "fitness_profiles", ["id"])

    op.create_table(
        "workout_plans",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_active", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("total_weeks", sa.Integer(), nullable=True, server_default="6"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index(op.f("ix_workout_plans_id"), "workout_plans", ["id"])
    op.create_index(op.f("ix_workout_plans_user_id"), "workout_plans", ["user_id"])

    op.create_table(
        "plan_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("plan_id", sa.Integer(), sa.ForeignKey("workout_plans.id"), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("day_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("exercises_json", sa.Text(), nullable=True),
        sa.Column("is_completed", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )
    op.create_index(op.f("ix_plan_sessions_id"), "plan_sessions", ["id"])
    op.create_index(op.f("ix_plan_sessions_plan_id"), "plan_sessions", ["plan_id"])

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used", sa.Integer(), nullable=True, server_default="0"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(op.f("ix_password_reset_tokens_id"), "password_reset_tokens", ["id"])
    op.create_index(op.f("ix_password_reset_tokens_email"), "password_reset_tokens", ["email"])


def downgrade() -> None:
    op.drop_table("plan_sessions")
    op.drop_table("workout_plans")
    op.drop_table("password_reset_tokens")
    op.drop_table("fitness_profiles")
    op.drop_table("weight_entries")
    op.drop_table("workouts")
    op.drop_table("food_logs")
    op.drop_table("users")
