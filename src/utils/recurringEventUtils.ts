import { Event } from '../types';

function parseDate(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function getBaseId(eventId: string): string {
  // Recurring ids shaped like: "<base>-YYYY-MM-DD"
  const parts = eventId.split('-');
  if (parts.length >= 4) return parts[0];
  return eventId;
}

/**
 * 반복 일정을 생성하는 함수
 *
 * @param baseEvent - 기준이 되는 이벤트
 * @returns 생성된 반복 일정 배열
 */
export function generateRecurringEvents(baseEvent: Event): Event[] {
  const { repeat, date: startDateStr, id: baseId } = baseEvent;

  if (!repeat || repeat.type === 'none') {
    return [baseEvent];
  }

  const startDate = parseDate(startDateStr);
  const maxEnd = new Date(2025, 11, 31);
  const specifiedEnd = repeat.endDate ? parseDate(repeat.endDate) : null;
  let endDate: Date = specifiedEnd ? specifiedEnd : maxEnd;
  if (!specifiedEnd && endDate > maxEnd) endDate = maxEnd;
  if (specifiedEnd && endDate > maxEnd) endDate = maxEnd;

  const events: Event[] = [];

  let current = new Date(startDate);
  while (current <= endDate) {
    const ds = formatDate(current);
    events.push({ ...baseEvent, id: `${baseId}-${ds}`, date: ds });

    if (repeat.type === 'daily') {
      current.setDate(current.getDate() + repeat.interval);
    } else if (repeat.type === 'weekly') {
      current.setDate(current.getDate() + repeat.interval * 7);
    } else if (repeat.type === 'monthly') {
      const targetDay = startDate.getDate();
      let m = current.getMonth() + repeat.interval;
      let y = current.getFullYear();
      while (m > 11) {
        m -= 12;
        y += 1;
      }
      const dim = daysInMonth(y, m);
      if (targetDay <= dim) {
        current = new Date(y, m, targetDay);
      } else {
        // Skip to next month with targetDay
        let nm = m;
        let ny = y;
        let found = false;
        while (new Date(ny, nm, 1) <= endDate) {
          nm += repeat.interval;
          while (nm > 11) {
            nm -= 12;
            ny += 1;
          }
          const dim2 = daysInMonth(ny, nm);
          if (targetDay <= dim2) {
            current = new Date(ny, nm, targetDay);
            found = true;
            break;
          }
        }
        if (!found) {
          // Force exit
          current = new Date(endDate.getFullYear() + 1, 0, 1);
        }
      }
    } else if (repeat.type === 'yearly') {
      const targetMonth = startDate.getMonth();
      const targetDay = startDate.getDate();
      let ny = current.getFullYear() + repeat.interval;

      if (targetMonth === 1 && targetDay === 29) {
        // Leap year: find next leap year
        while (!isLeapYear(ny) && new Date(ny, targetMonth, targetDay) <= endDate) {
          ny += repeat.interval;
        }
        if (new Date(ny, targetMonth, targetDay) <= endDate) {
          current = new Date(ny, targetMonth, targetDay);
        } else {
          current = new Date(endDate.getFullYear() + 1, 0, 1);
        }
      } else {
        current = new Date(ny, targetMonth, targetDay);
      }
    } else {
      break;
    }
  }

  return events;
}

/**
 * 반복 일정을 수정하는 함수
 *
 * @param events - 전체 이벤트 목록
 * @param eventId - 수정할 이벤트 ID
 * @param updatedData - 수정할 데이터
 * @param isSingleUpdate - true: 단일 수정, false: 전체 수정
 * @returns 수정된 이벤트 목록
 */
export function updateRecurringEvent(
  events: Event[],
  eventId: string,
  updatedData: Partial<Event>,
  isSingleUpdate: boolean
): Event[] {
  const baseId = getBaseId(eventId);
  return events.map((evt) => {
    const evtBase = getBaseId(evt.id);
    if (isSingleUpdate) {
      if (evt.id === eventId) {
        return {
          ...evt,
          ...updatedData,
          repeat: { type: 'none', interval: 0 },
        };
      }
      return evt;
    }
    if (evtBase === baseId) {
      return { ...evt, ...updatedData };
    }
    return evt;
  });
}

/**
 * 반복 일정을 삭제하는 함수
 *
 * @param events - 전체 이벤트 목록
 * @param eventId - 삭제할 이벤트 ID
 * @param isSingleDelete - true: 단일 삭제, false: 전체 삭제
 * @returns 삭제 후 남은 이벤트 목록
 */
export function deleteRecurringEvent(
  events: Event[],
  eventId: string,
  isSingleDelete: boolean
): Event[] {
  const baseId = getBaseId(eventId);
  if (isSingleDelete) {
    return events.filter((e) => e.id !== eventId);
  }
  return events.filter((e) => getBaseId(e.id) !== baseId);
}
