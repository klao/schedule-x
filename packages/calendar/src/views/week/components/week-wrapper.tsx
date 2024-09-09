import { PreactViewComponent } from '@schedule-x/shared/src/types/calendar/preact-view-component'
import { useState } from 'preact/hooks'
import TimeGridDay from '../../../components/week-grid/time-grid-day'
import TimeAxis from '../../../components/week-grid/time-axis'
import { AppContext } from '../../../utils/stateful/app-context'
import DateAxis from '../../../components/week-grid/date-axis'
import { Week } from '../../../types/week'
import { toJSDate } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/format-conversion'
import { sortEventsForWeekView } from '../../../utils/stateless/events/sort-events-for-week'
import { createWeek } from '../../../utils/stateless/views/week/create-week'
import { positionInTimeGrid } from '../../../utils/stateless/events/position-in-time-grid'
import { positionInDateGrid } from '../../../utils/stateless/events/position-in-date-grid'
import { sortEventsByStartAndEnd } from '../../../utils/stateless/events/sort-by-start-date'
import DateGridDay from '../../../components/week-grid/date-grid-day'
import { useSignalEffect } from '@preact/signals'

export const WeekWrapper: PreactViewComponent = ({ $app, id }) => {
  document.documentElement.style.setProperty(
    '--sx-week-grid-height',
    `${$app.config.weekOptions.gridHeight}px`
  )

  const [week, setWeek] = useState<Week>({})

  useSignalEffect(() => {
    const rangeStart = $app.calendarState.range.value?.start
    const rangeEnd = $app.calendarState.range.value?.end
    if (!rangeStart || !rangeEnd) return

    let newWeek = createWeek($app)
    const filteredEvents = $app.calendarEvents.filterPredicate.value
      ? $app.calendarEvents.list.value.filter(
          $app.calendarEvents.filterPredicate.value
        )
      : $app.calendarEvents.list.value
    const { dateGridEvents, timeGridEvents } =
      sortEventsForWeekView(filteredEvents)
    newWeek = positionInDateGrid(
      dateGridEvents.sort(sortEventsByStartAndEnd),
      newWeek
    )
    newWeek = positionInTimeGrid(timeGridEvents, newWeek, $app)
    setWeek(newWeek)
  })

  const navigate = (direction: 'forwards' | 'backwards') => {
    const currentView = $app.config.views.find(
      (view) => view.name === $app.calendarState.view.value
    )
    if (!currentView) return

    $app.datePickerState.selectedDate.value = currentView.backwardForwardFn(
      $app.datePickerState.selectedDate.value,
      direction === 'forwards'
        ? currentView.backwardForwardUnits
        : -currentView.backwardForwardUnits
    )
  }

  const [touchStartX, setTouchStartX] = useState(0)
  const [translateX, setTranslateX] = useState(0)

  const touchStartHandler = (event: TouchEvent) => {
    setTouchStartX(event.touches[0].clientX)
  }

  const touchMoveHandler = (event: TouchEvent) => {
    let diff = event.touches[0].clientX - touchStartX
    if (diff > 200) diff = 200
    if (diff < -200) diff = -200
    setTranslateX(diff)
  }

  const touchEndHandler = (event: TouchEvent) => {
    setTranslateX(0)
    const touchEndX = event.changedTouches[0].clientX
    const diff = touchEndX - touchStartX
    if (diff > 150) {
      navigate('backwards')
    } else if (diff < -150) {
      navigate('forwards')
    }
  }

  const touchCancelHandler = () => {
    setTranslateX(0)
  }

  return (
    <>
      <AppContext.Provider value={$app}>
        <div className="sx__week-wrapper" id={id}>
          <div className="sx__week-header">
            <div className="sx__week-header-content">
              <DateAxis
                week={Object.values(week).map((day) => toJSDate(day.date))}
              />

              <div
                className="sx__date-grid"
                aria-label={$app.translate('Full day- and multiple day events')}
              >
                {Object.values(week).map((day) => (
                  <DateGridDay
                    key={day.date}
                    date={day.date}
                    calendarEvents={day.dateGridEvents}
                  />
                ))}
              </div>

              <div className="sx__week-header-border" />
            </div>
          </div>

          <div
            className="sx__week-grid"
            onTouchStart={touchStartHandler}
            onTouchMove={touchMoveHandler}
            onTouchEnd={touchEndHandler}
            onTouchCancel={touchCancelHandler}
            style={{
              transform: `translateX(${translateX}px)`,
            }}
          >
            <TimeAxis />

            {Object.values(week).map((day) => (
              <TimeGridDay
                calendarEvents={day.timeGridEvents}
                date={day.date}
                key={day.date}
              />
            ))}
          </div>
        </div>
      </AppContext.Provider>
    </>
  )
}
