import { ChevronRight, ClipboardList, Shield, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import AdminMetricCard from '../../components/admin/AdminMetricCard'
import PageHeader from '../../components/common/PageHeader'
import SectionCard from '../../components/common/SectionCard'
import { useCorrespondence } from '../../context/useCorrespondence'
import { offices } from '../../data/offices'
import { getUsers } from '../../data/users'

function AdminDashboardPage() {
  const navigate = useNavigate()
  const { records } = useCorrespondence()
  const users = getUsers()
  const dueSoon = records.filter((record) => record.deadlineState === 'due-soon').length
  const overdue = records.filter((record) => record.status === 'Overdue').length
  const activeUsers = users.filter((user) => user.status === 'Active').length
  const activeOffices = offices.filter((office) => office.status === 'Active').length
  const administrators = users.filter((user) => user.role === 'SYSTEM_ADMIN').length

  return (
    <section className="admin-page">
      <div className="admin-page-content">
        <PageHeader
          eyebrow="Administration"
          title="Administrator Dashboard"
          description="System-wide oversight of users, offices, correspondence activity, and security records."
          actions={
            <div className="split-actions admin-page-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => navigate('/admin/audit-log')}
              >
                Review Audit Log
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => navigate('/admin/users-offices')}
              >
                Manage Users &amp; Offices
              </button>
            </div>
          }
        />

        <div className="notice-strip admin-page-notice">
          Administrative oversight is limited to users, offices, routing control, and security accountability.
        </div>

        <section className="admin-metric-grid admin-dashboard-metrics">
          <AdminMetricCard label="Active Correspondence" value={records.length} description="Across authorised offices" />
          <AdminMetricCard label="Due Soon" value={dueSoon} description="Within 48 hours" tone="amber" />
          <AdminMetricCard label="Overdue" value={overdue} description="Across active offices" tone="red" />
          <AdminMetricCard label="Active Users" value={activeUsers} description="Can currently sign in" />
          <AdminMetricCard label="Active Offices" value={activeOffices} description="Available for routing" />
        </section>

        <div className="admin-dashboard-grid">
          <SectionCard
            className="admin-section-card"
            title="Office Overview"
            description="High-level workload and overdue position across active offices."
            action={
              <button
                type="button"
                className="button button--ghost"
                onClick={() => navigate('/admin/users-offices')}
              >
                Manage Offices
              </button>
            }
          >
            <div className="admin-office-list">
              {offices.slice(0, 5).map((office) => (
                <div key={office.id} className="admin-office-row">
                  <div className="admin-office-row__identity">
                    <strong>{office.name}</strong>
                    <span className="muted-copy">{office.activeUsers} active users</span>
                  </div>
                  <div className="admin-office-row__metric">
                    <span className="data-label">Active</span>
                    <span>{office.activeCorrespondence}</span>
                  </div>
                  <div className="admin-office-row__metric">
                    <span className="data-label">Overdue</span>
                    <span>{office.overdue}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="admin-dashboard-side">
            <SectionCard
              className="admin-section-card"
              title="Quick Administration"
              description="Common administrative actions."
            >
              <div className="admin-quick-actions">
                <button
                  type="button"
                  className="admin-quick-action"
                  onClick={() => navigate('/admin/users-offices')}
                >
                  <span className="admin-quick-action__icon">
                    <UsersRound size={17} />
                  </span>
                  <span className="admin-quick-action__copy">
                    <strong>Manage Users &amp; Offices</strong>
                    <span>Create accounts, assign roles and offices, and control access.</span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className="admin-quick-action"
                  onClick={() => navigate('/admin/audit-log')}
                >
                  <span className="admin-quick-action__icon">
                    <Shield size={17} />
                  </span>
                  <span className="admin-quick-action__copy">
                    <strong>Review Audit Log</strong>
                    <span>Inspect system-wide activity and security actions.</span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className="admin-quick-action"
                  onClick={() => navigate('/correspondence?status=all')}
                >
                  <span className="admin-quick-action__icon">
                    <ClipboardList size={17} />
                  </span>
                  <span className="admin-quick-action__copy">
                    <strong>Review Correspondence Oversight</strong>
                    <span>Open correspondence oversight across authorised offices.</span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </SectionCard>

            <SectionCard
              className="admin-section-card"
              title="System Access Summary"
              description="Current account and office position."
            >
              <div className="admin-access-summary">
                <div className="admin-access-summary__row">
                  <span>Total Accounts</span>
                  <strong>{users.length}</strong>
                </div>
                <div className="admin-access-summary__row">
                  <span>Active Accounts</span>
                  <strong>{activeUsers}</strong>
                </div>
                <div className="admin-access-summary__row">
                  <span>Administrators</span>
                  <strong>{administrators}</strong>
                </div>
                <div className="admin-access-summary__row">
                  <span>Active Offices</span>
                  <strong>{activeOffices}</strong>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AdminDashboardPage
