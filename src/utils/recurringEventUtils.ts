import { Event } from '../types';

/**
 * 반복 일정을 생성하는 함수
 * 
 * @param baseEvent - 기준이 되는 이벤트
 * @returns 생성된 반복 일정 배열
 */
export function generateRecurringEvents(_baseEvent: Event): Event[] {
  // 🔴 RED: 구현 전
  return [];
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
  _eventId: string,
  _updatedData: Partial<Event>,
  _isSingleUpdate: boolean
): Event[] {
  // 🔴 RED: 구현 전
  return events;
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
  _eventId: string,
  _isSingleDelete: boolean
): Event[] {
  // 🔴 RED: 구현 전
  return events;
}

