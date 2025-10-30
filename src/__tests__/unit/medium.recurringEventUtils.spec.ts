import { describe, it, expect } from 'vitest';
import { Event } from '../../types';
import {
  generateRecurringEvents,
  updateRecurringEvent,
  deleteRecurringEvent,
} from '../../utils/recurringEventUtils';

describe('recurringEventUtils', () => {
  describe('generateRecurringEvents', () => {
    it('매일 반복 일정을 생성해야 한다', () => {
      const baseEvent: Event = {
        id: '1',
        title: '매일 회의',
        date: '2024-07-01',
        startTime: '10:00',
        endTime: '11:00',
        description: '매일 반복',
        location: '회의실',
        category: '업무',
        repeat: {
          type: 'daily',
          interval: 1,
          endDate: '2024-07-03',
        },
        notificationTime: 10,
      };

      const result = generateRecurringEvents(baseEvent);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-07-01');
      expect(result[1].date).toBe('2024-07-02');
      expect(result[2].date).toBe('2024-07-03');
      expect(result[0].id).toBe('1-2024-07-01');
      expect(result[1].id).toBe('1-2024-07-02');
      expect(result[2].id).toBe('1-2024-07-03');
    });

    it('매주 반복 일정을 생성해야 한다', () => {
      const baseEvent: Event = {
        id: '2',
        title: '주간 회의',
        date: '2024-07-01',
        startTime: '14:00',
        endTime: '15:00',
        description: '매주 반복',
        location: '회의실 A',
        category: '업무',
        repeat: {
          type: 'weekly',
          interval: 1,
          endDate: '2024-07-15',
        },
        notificationTime: 10,
      };

      const result = generateRecurringEvents(baseEvent);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-07-01');
      expect(result[1].date).toBe('2024-07-08');
      expect(result[2].date).toBe('2024-07-15');
    });

    it('매월 반복 일정을 생성해야 한다', () => {
      const baseEvent: Event = {
        id: '3',
        title: '월간 회의',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '매월 반복',
        location: '본사',
        category: '업무',
        repeat: {
          type: 'monthly',
          interval: 1,
          endDate: '2024-03-15',
        },
        notificationTime: 10,
      };

      const result = generateRecurringEvents(baseEvent);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-01-15');
      expect(result[1].date).toBe('2024-02-15');
      expect(result[2].date).toBe('2024-03-15');
    });

    it('31일에 매월 반복 선택 시 31일이 있는 달에만 생성해야 한다', () => {
      const baseEvent: Event = {
        id: '4',
        title: '월말 결산',
        date: '2024-01-31',
        startTime: '16:00',
        endTime: '17:00',
        description: '매월 31일',
        location: '재무팀',
        category: '업무',
        repeat: {
          type: 'monthly',
          interval: 1,
          endDate: '2024-05-31',
        },
        notificationTime: 10,
      };

      const result = generateRecurringEvents(baseEvent);

      // 1월, 3월, 5월만 31일이 존재 (2월, 4월은 31일 없음)
      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-01-31');
      expect(result[1].date).toBe('2024-03-31');
      expect(result[2].date).toBe('2024-05-31');
    });

    it('매년 반복 일정을 생성해야 한다', () => {
      const baseEvent: Event = {
        id: '5',
        title: '연간 이벤트',
        date: '2024-01-01',
        startTime: '00:00',
        endTime: '23:59',
        description: '매년 반복',
        location: '전체',
        category: '기타',
        repeat: {
          type: 'yearly',
          interval: 1,
          endDate: '2026-01-01',
        },
        notificationTime: 10,
      };

      const result = generateRecurringEvents(baseEvent);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[1].date).toBe('2025-01-01');
      expect(result[2].date).toBe('2026-01-01');
    });

    it('윤년 2월 29일에 매년 반복 선택 시 윤년에만 생성해야 한다', () => {
      const baseEvent: Event = {
        id: '6',
        title: '윤년 이벤트',
        date: '2024-02-29',
        startTime: '12:00',
        endTime: '13:00',
        description: '윤년에만',
        location: '특별실',
        category: '기타',
        repeat: {
          type: 'yearly',
          interval: 1,
          endDate: '2028-02-29',
        },
        notificationTime: 10,
      };

      const result = generateRecurringEvents(baseEvent);

      // 2024, 2028만 윤년 (2025, 2026, 2027은 평년)
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-02-29');
      expect(result[1].date).toBe('2028-02-29');
    });

    it('반복 종료일이 지정되면 해당 날짜까지만 생성해야 한다', () => {
      const baseEvent: Event = {
        id: '7',
        title: '기한 있는 반복',
        date: '2024-07-01',
        startTime: '10:00',
        endTime: '11:00',
        description: '7월 5일까지',
        location: '회의실',
        category: '업무',
        repeat: {
          type: 'daily',
          interval: 1,
          endDate: '2024-07-05',
        },
        notificationTime: 10,
      };

      const result = generateRecurringEvents(baseEvent);

      expect(result).toHaveLength(5);
      expect(result[result.length - 1].date).toBe('2024-07-05');
    });

    it('반복 종료일이 없으면 2025-12-31까지 생성해야 한다', () => {
      const baseEvent: Event = {
        id: '8',
        title: '종료일 없는 반복',
        date: '2025-12-30',
        startTime: '10:00',
        endTime: '11:00',
        description: '최대 날짜까지',
        location: '회의실',
        category: '업무',
        repeat: {
          type: 'daily',
          interval: 1,
        },
        notificationTime: 10,
      };

      const result = generateRecurringEvents(baseEvent);

      // 2025-12-30, 2025-12-31 (2일)
      expect(result).toHaveLength(2);
      expect(result[result.length - 1].date).toBe('2025-12-31');
    });

    it('반복 간격이 2 이상인 경우를 처리해야 한다', () => {
      const baseEvent: Event = {
        id: '9',
        title: '2일 간격 반복',
        date: '2024-07-01',
        startTime: '10:00',
        endTime: '11:00',
        description: '격일 반복',
        location: '회의실',
        category: '업무',
        repeat: {
          type: 'daily',
          interval: 2,
          endDate: '2024-07-07',
        },
        notificationTime: 10,
      };

      const result = generateRecurringEvents(baseEvent);

      expect(result).toHaveLength(4);
      expect(result[0].date).toBe('2024-07-01');
      expect(result[1].date).toBe('2024-07-03');
      expect(result[2].date).toBe('2024-07-05');
      expect(result[3].date).toBe('2024-07-07');
    });

    it('반복 타입이 none이면 단일 일정만 반환해야 한다', () => {
      const baseEvent: Event = {
        id: '10',
        title: '단일 일정',
        date: '2024-07-01',
        startTime: '10:00',
        endTime: '11:00',
        description: '반복 없음',
        location: '회의실',
        category: '업무',
        repeat: {
          type: 'none',
          interval: 0,
        },
        notificationTime: 10,
      };

      const result = generateRecurringEvents(baseEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(baseEvent);
    });
  });

  describe('updateRecurringEvent', () => {
    const events: Event[] = [
      {
        id: '1-2024-07-01',
        title: '매일 회의',
        date: '2024-07-01',
        startTime: '10:00',
        endTime: '11:00',
        description: '매일 반복',
        location: '회의실',
        category: '업무',
        repeat: { type: 'daily', interval: 1 },
        notificationTime: 10,
      },
      {
        id: '1-2024-07-02',
        title: '매일 회의',
        date: '2024-07-02',
        startTime: '10:00',
        endTime: '11:00',
        description: '매일 반복',
        location: '회의실',
        category: '업무',
        repeat: { type: 'daily', interval: 1 },
        notificationTime: 10,
      },
      {
        id: '1-2024-07-03',
        title: '매일 회의',
        date: '2024-07-03',
        startTime: '10:00',
        endTime: '11:00',
        description: '매일 반복',
        location: '회의실',
        category: '업무',
        repeat: { type: 'daily', interval: 1 },
        notificationTime: 10,
      },
    ];

    it('단일 수정 시 해당 이벤트만 수정하고 repeat.type을 none으로 변경해야 한다', () => {
      const result = updateRecurringEvent(
        events,
        '1-2024-07-02',
        { title: '수정된 회의' },
        true
      );

      // 단일 수정된 이벤트
      const updated = result.find((e) => e.id === '1-2024-07-02');
      expect(updated?.title).toBe('수정된 회의');
      expect(updated?.repeat.type).toBe('none');

      // 다른 이벤트는 변경되지 않음
      const other1 = result.find((e) => e.id === '1-2024-07-01');
      const other2 = result.find((e) => e.id === '1-2024-07-03');
      expect(other1?.title).toBe('매일 회의');
      expect(other1?.repeat.type).toBe('daily');
      expect(other2?.title).toBe('매일 회의');
      expect(other2?.repeat.type).toBe('daily');
    });

    it('전체 수정 시 같은 그룹의 모든 이벤트를 수정하고 repeat.type을 유지해야 한다', () => {
      const result = updateRecurringEvent(
        events,
        '1-2024-07-02',
        { title: '전체 수정된 회의', location: '새 회의실' },
        false
      );

      // 모든 이벤트가 수정됨
      result.forEach((event) => {
        if (event.id.startsWith('1-')) {
          expect(event.title).toBe('전체 수정된 회의');
          expect(event.location).toBe('새 회의실');
          expect(event.repeat.type).toBe('daily'); // repeat.type 유지
        }
      });
    });
  });

  describe('deleteRecurringEvent', () => {
    const events: Event[] = [
      {
        id: '1-2024-07-01',
        title: '매일 회의',
        date: '2024-07-01',
        startTime: '10:00',
        endTime: '11:00',
        description: '매일 반복',
        location: '회의실',
        category: '업무',
        repeat: { type: 'daily', interval: 1 },
        notificationTime: 10,
      },
      {
        id: '1-2024-07-02',
        title: '매일 회의',
        date: '2024-07-02',
        startTime: '10:00',
        endTime: '11:00',
        description: '매일 반복',
        location: '회의실',
        category: '업무',
        repeat: { type: 'daily', interval: 1 },
        notificationTime: 10,
      },
      {
        id: '1-2024-07-03',
        title: '매일 회의',
        date: '2024-07-03',
        startTime: '10:00',
        endTime: '11:00',
        description: '매일 반복',
        location: '회의실',
        category: '업무',
        repeat: { type: 'daily', interval: 1 },
        notificationTime: 10,
      },
      {
        id: '2-2024-07-01',
        title: '다른 일정',
        date: '2024-07-01',
        startTime: '14:00',
        endTime: '15:00',
        description: '별개 일정',
        location: '회의실 B',
        category: '개인',
        repeat: { type: 'none', interval: 0 },
        notificationTime: 10,
      },
    ];

    it('단일 삭제 시 해당 이벤트만 삭제해야 한다', () => {
      const result = deleteRecurringEvent(events, '1-2024-07-02', true);

      expect(result).toHaveLength(3);
      expect(result.find((e) => e.id === '1-2024-07-02')).toBeUndefined();
      expect(result.find((e) => e.id === '1-2024-07-01')).toBeDefined();
      expect(result.find((e) => e.id === '1-2024-07-03')).toBeDefined();
      expect(result.find((e) => e.id === '2-2024-07-01')).toBeDefined();
    });

    it('전체 삭제 시 같은 그룹의 모든 이벤트를 삭제해야 한다', () => {
      const result = deleteRecurringEvent(events, '1-2024-07-02', false);

      expect(result).toHaveLength(1);
      expect(result.find((e) => e.id === '1-2024-07-01')).toBeUndefined();
      expect(result.find((e) => e.id === '1-2024-07-02')).toBeUndefined();
      expect(result.find((e) => e.id === '1-2024-07-03')).toBeUndefined();
      expect(result.find((e) => e.id === '2-2024-07-01')).toBeDefined();
    });
  });
});

