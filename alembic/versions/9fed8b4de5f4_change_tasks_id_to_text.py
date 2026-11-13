"""change tasks id to text

Revision ID: 9fed8b4de5f4
Revises: 5f72580bc854
Create Date: 2026-11-13 17:08:34.479732

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9fed8b4de5f4'
down_revision: Union[str, Sequence[str], None] = '5f72580bc854'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.drop_constraint('task_events_task_id_fkey', 'task_events', type_='foreignkey')
        op.alter_column('tasks', 'id',
                        type_=sa.Text(),
                        postgresql_using='id::text',
                        existing_nullable=False)
        op.alter_column('task_events', 'task_id',
                        type_=sa.Text(),
                        postgresql_using='task_id::text',
                        existing_nullable=False)
        op.create_foreign_key('task_events_task_id_fkey', 'task_events', 'tasks', ['task_id'], ['id'], ondelete='CASCADE')
    else:
        with op.batch_alter_table('task_events') as batch_op:
            batch_op.alter_column('task_id', type_=sa.Text(), existing_nullable=False)
        with op.batch_alter_table('tasks') as batch_op:
            batch_op.alter_column('id', type_=sa.Text(), existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.drop_constraint('task_events_task_id_fkey', 'task_events', type_='foreignkey')
        op.alter_column('tasks', 'id',
                        type_=sa.Uuid(),
                        postgresql_using='id::uuid',
                        existing_nullable=False)
        op.alter_column('task_events', 'task_id',
                        type_=sa.Uuid(),
                        postgresql_using='task_id::uuid',
                        existing_nullable=False)
        op.create_foreign_key('task_events_task_id_fkey', 'task_events', 'tasks', ['task_id'], ['id'], ondelete='CASCADE')
    else:
        with op.batch_alter_table('tasks') as batch_op:
            batch_op.alter_column('id', type_=sa.CHAR(length=32), existing_nullable=False)
        with op.batch_alter_table('task_events') as batch_op:
            batch_op.alter_column('task_id', type_=sa.CHAR(length=32), existing_nullable=False)
