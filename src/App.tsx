//v3
// collects ride events, calculates analytics, displays recent events
//added a bar chart
import { useState } from 'react'
import './App.css'

type EventType =
  | 'user_ride_requested'
  | 'ride_matched'
  | 'user_ride_cancelled'
  | 'driver_ride_cancelled'
  | 'ride_completed'

type RideState =
  | 'none'
  | 'requested'
  | 'matched'
  | 'user_cancelled'
  | 'completed'

type RideEvent = {
  id: string
  rideId: string
  type: EventType
  route: string
  timestamp: string
}

type ChartItem = {
  label: string
  value: number
  className: string
}

function App() {
  const [events, setEvents] = useState<RideEvent[]>([])
  const [eventType, setEventType] =
    useState<EventType>('user_ride_requested')
  const [rideId, setRideId] = useState('')
  const [route, setRoute] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  /*
   * Events are stored newest first.
   * Reversing them lets us process each ride from oldest to newest.
   */
  function getRideState(selectedRideId: string): RideState {
    const chronologicalEvents = events
      .filter((rideEvent) => rideEvent.rideId === selectedRideId)
      .slice()
      .reverse()

    let state: RideState = 'none'

    chronologicalEvents.forEach((rideEvent) => {
      if (rideEvent.type === 'user_ride_requested') {
        state = 'requested'
      }

      if (rideEvent.type === 'ride_matched') {
        state = 'matched'
      }

      if (rideEvent.type === 'driver_ride_cancelled') {
        /*
         * A driver cancellation puts the ride back into the pool
         * so that it can be matched with another driver.
         */
        state = 'requested'
      }

      if (rideEvent.type === 'user_ride_cancelled') {
        state = 'user_cancelled'
      }

      if (rideEvent.type === 'ride_completed') {
        state = 'completed'
      }
    })

    return state
  }

  const uniqueRideIds = Array.from(
    new Set(events.map((rideEvent) => rideEvent.rideId)),
  )

  const requestedNotMatched = uniqueRideIds.filter(
    (currentRideId) => getRideState(currentRideId) === 'requested',
  ).length

  const currentlyMatched = uniqueRideIds.filter(
    (currentRideId) => getRideState(currentRideId) === 'matched',
  ).length

  const cancelledByUser = uniqueRideIds.filter(
    (currentRideId) => getRideState(currentRideId) === 'user_cancelled',
  ).length

  const completedRides = uniqueRideIds.filter(
    (currentRideId) => getRideState(currentRideId) === 'completed',
  ).length

  /*
   * This is an event count rather than a current-state count.
   * A ride can be cancelled by a driver, return to requested,
   * and later be matched again.
   */
  const cancelledByDriver = events.filter(
    (rideEvent) => rideEvent.type === 'driver_ride_cancelled',
  ).length

  const totalRequestedRides = events.filter(
    (rideEvent) => rideEvent.type === 'user_ride_requested',
  ).length

  const completionRate =
    totalRequestedRides === 0
      ? 0
      : Math.round((completedRides / totalRequestedRides) * 100)

  const chartData: ChartItem[] = [
    {
      label: 'Requested, Not Matched',
      value: requestedNotMatched,
      className: 'requested-bar',
    },
    {
      label: 'Cancelled by User',
      value: cancelledByUser,
      className: 'user-cancelled-bar',
    },
    {
      label: 'Cancelled by Driver',
      value: cancelledByDriver,
      className: 'driver-cancelled-bar',
    },
    {
      label: 'Completed',
      value: completedRides,
      className: 'completed-bar',
    },
  ]

  const largestChartValue = Math.max(
    1,
    ...chartData.map((chartItem) => chartItem.value),
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    const cleanedRideId = rideId.trim()
    const cleanedRoute = route.trim()

    if (!cleanedRideId || !cleanedRoute) {
      setErrorMessage('Please enter both a Ride ID and a route.')
      return
    }

    const currentState = getRideState(cleanedRideId)

    if (
      eventType === 'user_ride_requested' &&
      currentState !== 'none'
    ) {
      setErrorMessage(
        `Ride ${cleanedRideId} has already been created. Use a new Ride ID.`,
      )
      return
    }

    if (
      eventType !== 'user_ride_requested' &&
      currentState === 'none'
    ) {
      setErrorMessage(
        `Ride ${cleanedRideId} must be requested before another event can occur.`,
      )
      return
    }

    if (
      eventType === 'ride_matched' &&
      currentState !== 'requested'
    ) {
      if (currentState === 'matched') {
        setErrorMessage(`Ride ${cleanedRideId} is already matched.`)
      } else {
        setErrorMessage(
          `Ride ${cleanedRideId} is not currently available to be matched.`,
        )
      }

      return
    }

    if (
      eventType === 'ride_completed' &&
      currentState !== 'matched'
    ) {
      setErrorMessage(
        `Ride ${cleanedRideId} must be matched before it can be completed.`,
      )
      return
    }

    if (
      eventType === 'driver_ride_cancelled' &&
      currentState !== 'matched'
    ) {
      setErrorMessage(
        `Ride ${cleanedRideId} must be matched before its driver can cancel.`,
      )
      return
    }

    if (
      eventType === 'user_ride_cancelled' &&
      currentState !== 'requested' &&
      currentState !== 'matched'
    ) {
      setErrorMessage(
        `Ride ${cleanedRideId} cannot be cancelled in its current state.`,
      )
      return
    }

    const newEvent: RideEvent = {
      id: crypto.randomUUID(),
      rideId: cleanedRideId,
      type: eventType,
      route: cleanedRoute,
      timestamp: new Date().toLocaleString(),
    }

    setEvents((currentEvents) => [newEvent, ...currentEvents])
    setRideId('')
    setRoute('')
  }

  function formatEventType(type: EventType) {
    const eventLabels: Record<EventType, string> = {
      user_ride_requested: 'Ride Requested',
      ride_matched: 'Ride Matched',
      user_ride_cancelled: 'Cancelled by User',
      driver_ride_cancelled: 'Cancelled by Driver',
      ride_completed: 'Ride Completed',
    }

    return eventLabels[type]
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Kamel Ride</p>
          <h1>Ride Analytics</h1>
          <p className="subtitle">
            Record activity and monitor platform performance.
          </p>
        </div>
      </header>

      <section className="dashboard-grid">
        <div className="panel">
          <h2>Add an Event</h2>

          <form onSubmit={handleSubmit} className="event-form">
            <label>
              Event type
              <select
                value={eventType}
                onChange={(event) =>
                  setEventType(event.target.value as EventType)
                }
              >
                <option value="user_ride_requested">
                  Ride Requested
                </option>

                <option value="ride_matched">
                  Ride Matched
                </option>

                <option value="user_ride_cancelled">
                  Cancelled by User
                </option>

                <option value="driver_ride_cancelled">
                  Cancelled by Driver
                </option>

                <option value="ride_completed">
                  Ride Completed
                </option>
              </select>
            </label>

            <label>
              Ride ID
              <input
                type="text"
                value={rideId}
                onChange={(event) => setRideId(event.target.value)}
                placeholder="Ex: r01"
              />
            </label>

            <label>
              Route
              <input
                type="text"
                value={route}
                onChange={(event) => setRoute(event.target.value)}
                placeholder="Ex: Ithaca,NY → Chicago,IL"
              />
            </label>

            {errorMessage && (
              <p className="error-message" role="alert">
                {errorMessage}
              </p>
            )}

            <button type="submit">Add Event</button>
          </form>
        </div>

        <div className="panel">
          <h2>Overview</h2>

          <div className="metric-grid">
            <article className="metric-card">
              <p>Total Events</p>
              <strong>{events.length}</strong>
            </article>

            <article className="metric-card">
              <p>Total Rides</p>
              <strong>{uniqueRideIds.length}</strong>
            </article>

            <article className="metric-card">
              <p>Requested, Not Matched</p>
              <strong>{requestedNotMatched}</strong>
            </article>

            <article className="metric-card">
              <p>Currently Matched</p>
              <strong>{currentlyMatched}</strong>
            </article>

            <article className="metric-card">
              <p>Cancelled by User</p>
              <strong>{cancelledByUser}</strong>
            </article>

            <article className="metric-card">
              <p>Driver Cancellations</p>
              <strong>{cancelledByDriver}</strong>
            </article>

            <article className="metric-card">
              <p>Completed Rides</p>
              <strong>{completedRides}</strong>
            </article>

            <article className="metric-card">
              <p>Completion Rate</p>
              <strong>{completionRate}%</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="panel analytics-chart">
        <div className="chart-heading">
          <div>
            <p className="eyebrow">Current ride outcomes</p>
            <h2>Ride Status Analytics</h2>
          </div>

          <p className="chart-note">
            Driver-cancelled rides return to the requested pool.
          </p>
        </div>

        <div
          className="bar-chart"
          role="img"
          aria-label="Bar chart showing requested unmatched rides, user cancellations, driver cancellations, and completed rides"
        >
          {chartData.map((chartItem) => {
            const barWidth =
              chartItem.value === 0
                ? 0
                : (chartItem.value / largestChartValue) * 100

            return (
              <div className="bar-row" key={chartItem.label}>
                <div className="bar-label">
                  <span>{chartItem.label}</span>
                  <strong>{chartItem.value}</strong>
                </div>

                <div className="bar-track">
                  <div
                    className={`bar-fill ${chartItem.className}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel recent-events">
        <h2>Recent Events</h2>

        {events.length === 0 ? (
          <p className="empty-state">
            No events have been collected yet. Add your first event above.
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ride ID</th>
                  <th>Event</th>
                  <th>Route</th>
                  <th>Time</th>
                </tr>
              </thead>

              <tbody>
                {events.map((rideEvent) => (
                  <tr key={rideEvent.id}>
                    <td>{rideEvent.rideId}</td>
                    <td>{formatEventType(rideEvent.type)}</td>
                    <td>{rideEvent.route}</td>
                    <td>{rideEvent.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

export default App