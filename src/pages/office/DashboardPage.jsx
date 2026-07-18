import {
  Bell,
  Building2,
  ChartNoAxesColumn,
  Clock3,
  FilePlus2,
  FileText,
  Timer,
  TriangleAlert,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'

import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import SectionCard from '../../components/common/SectionCard'
import CorrespondenceAttentionList from '../../components/correspondence/CorrespondenceAttentionList'
import QuickActionCard from '../../components/dashboard/QuickActionCard'
import { ROLES } from '../../constants/roles'
import { useAuth } from '../../context/useAuth'
import { useCorrespondence } from '../../context/useCorrespondence'

function DashboardPage() {
  const { currentUser } = useAuth()
  const { records } = useCorrespondence()
  const officeName = currentUser?.officeName ?? 'Office'
  const heading = `${officeName} Dashboard`
  const activeOfficeRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.currentOffice === currentUser?.officeName &&
          !['Completed', 'Filed'].includes(record.status),
      ),
    [currentUser?.officeName, records],
  )
  const activeInOfficeCount = activeOfficeRecords.length
  const inProgressCount = activeOfficeRecords.filter((record) =>
    ['In Progress', 'Awaiting Action', 'Registered', 'Forwarded'].includes(record.status),
  ).length
  const dueSoonCount = activeOfficeRecords.filter(
    (record) => record.deadlineState === 'due-soon',
  ).length
  const overdueCount = activeOfficeRecords.filter(
    (record) => record.deadlineState === 'overdue',
  ).length
  const attentionRecords = [...activeOfficeRecords]
    .sort((left, right) => {
      const getPriorityRank = (record) => {
        if (record.deadlineState === 'overdue') {
          return 0
        }

        if (record.status === 'Received' && record.receiptStatus === 'Pending') {
          return 1
        }

        if (record.deadlineState === 'due-soon') {
          return 2
        }

        if (record.status === 'Awaiting Action') {
          return 3
        }

        if (record.status === 'In Progress') {
          return 4
        }

        if (record.status === 'Registered') {
          return 5
        }

        return 6
      }

      const leftRank = getPriorityRank(left)
      const rightRank = getPriorityRank(right)

      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      return left.reference.localeCompare(right.reference)
    })
    .slice(0, 5)
  const averageTimeInOfficeLabel = useMemo(() => {
    const hourValues = activeOfficeRecords
      .map((record) => {
        const value = record.timeSpentInOffice ?? ''
        const daysMatch = String(value).match(/(\d+)\s+day/)
        const hoursMatch = String(value).match(/(\d+)\s+hour/)
        const days = daysMatch ? Number(daysMatch[1]) : 0
        const hours = hoursMatch ? Number(hoursMatch[1]) : 0

        if (!days && !hours) {
          return null
        }

        return days * 24 + hours
      })
      .filter((value) => value !== null)

    if (!hourValues.length) {
      return 'Not recorded'
    }

    const averageHours =
      hourValues.reduce((total, current) => total + current, 0) / hourValues.length

    if (averageHours >= 24) {
      return `${(averageHours / 24).toFixed(1)} days`
    }

    return `${Math.max(1, Math.round(averageHours))} hours`
  }, [activeOfficeRecords])

  if (currentUser?.role === ROLES.SYSTEM_ADMIN) {
    return <Navigate to="/admin/dashboard" replace />
  }
  const stats = [
    {
      title: 'Active in Office',
      value: activeInOfficeCount,
      description: `Currently with ${officeName}`,
      tone: 'default',
    },
    {
      title: 'In Progress',
      value: inProgressCount,
      description: 'Actively being handled',
      tone: 'default',
    },
    {
      title: 'Due Soon',
      value: dueSoonCount,
      description: 'Due within 48 hours',
      tone: 'warning',
    },
    {
      title: 'Overdue',
      value: overdueCount,
      description: 'Past office deadline',
      tone: 'danger',
    },
  ]

  const quickActions = [
    {
      title: 'Register New Correspondence',
      description: 'Create a new record for office-owned correspondence.',
      to: '/correspondence/new',
      icon: FilePlus2,
    },
    {
      title: 'Review Overdue Items',
      description: 'Open correspondence records that have passed office deadline.',
      to: '/correspondence?status=overdue',
      icon: Clock3,
    },
    {
      title: 'View Notifications',
      description: 'Review recent updates and routed correspondence alerts.',
      to: '/notifications',
      icon: Bell,
    },
  ]

  if (currentUser?.role === ROLES.OFFICE_SUPERVISOR) {
    quickActions.push({
      title: 'View Office Reports',
      description: 'Open confidential reports for this office.',
      to: '/reports',
      icon: ChartNoAxesColumn,
    })
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        title={heading}
        description="A summary of correspondence currently requiring attention from your office."
        actions={
          <Link
            to="/correspondence/new"
            className="button button--primary dashboard-header__action"
          >
            <FilePlus2 size={18} aria-hidden="true" />
            <span>Register New Correspondence</span>
          </Link>
        }
      />

      <section className="dashboard-stats" aria-label="Office correspondence summary">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            tone={stat.tone}
          />
        ))}
      </section>

      <div className="dashboard-grid">
        <SectionCard
          title="Correspondence Requiring Attention"
          description={`Recent records requiring action by the ${officeName}.`}
          action={
            <Link to="/correspondence?status=all" className="dashboard-panel__link">
              View all
            </Link>
          }
          className="dashboard-panel dashboard-panel--attention"
        >
          <CorrespondenceAttentionList records={attentionRecords} />
        </SectionCard>

        <aside className="dashboard-sidebar">
          <SectionCard
            title="Quick Actions"
            description="Common office tasks related to current correspondence handling."
            className="dashboard-panel"
          >
            <div className="quick-actions-list">
              {quickActions.map((action) => (
                <QuickActionCard
                  key={action.title}
                  title={action.title}
                  description={action.description}
                  to={action.to}
                  icon={action.icon}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Office Position"
            description="Current workload summary."
            className="dashboard-panel"
          >
            <div className="office-position-summary">
              <div className="office-position-summary__item">
                <span className="office-position-summary__icon">
                  <Building2 size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>{officeName}</strong>
                  <p>{activeInOfficeCount} active correspondence records.</p>
                </div>
              </div>
              <div className="office-position-summary__item">
                <span className="office-position-summary__icon office-position-summary__icon--amber">
                  <Timer size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>Average time in office: {averageTimeInOfficeLabel}</strong>
                  <p>Based on current active correspondence.</p>
                </div>
              </div>
              <div className="office-position-summary__item">
                <span className="office-position-summary__icon">
                  <FileText size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>Due soon: {dueSoonCount}</strong>
                  <p>Records approaching the office deadline.</p>
                </div>
              </div>
              <div className="office-position-summary__item">
                <span className="office-position-summary__icon office-position-summary__icon--danger">
                  <TriangleAlert size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>Overdue: {overdueCount}</strong>
                  <p>Records past the current office deadline.</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </section>
  )
}

export default DashboardPage
