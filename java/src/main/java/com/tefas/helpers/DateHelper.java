package com.tefas.helpers;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Tarih yardımcı metotları
 */
public class DateHelper {
    private static final DateTimeFormatter API_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter TR_DATE_FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter ISO_DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    public record DateRange(LocalDate start, LocalDate end) {}

    public static LocalDate getLastBusinessDay() {
        return getLastBusinessDay(LocalDate.now(ZoneOffset.UTC));
    }

    public static LocalDate getLastBusinessDay(LocalDate reference) {
        LocalDate d = reference;
        if (d.getDayOfWeek() == DayOfWeek.SATURDAY) {
            return d.minusDays(1);
        }
        if (d.getDayOfWeek() == DayOfWeek.SUNDAY) {
            return d.minusDays(2);
        }
        return d;
    }

    public static LocalDate previousBusinessDay(LocalDate date) {
        LocalDate current = date.minusDays(1);
        while (current.getDayOfWeek() == DayOfWeek.SATURDAY || current.getDayOfWeek() == DayOfWeek.SUNDAY) {
            current = current.minusDays(1);
        }
        return current;
    }

    public static String formatDate(LocalDate date) {
        return date.format(API_DATE_FMT);
    }

    public static List<DateRange> iterDateChunks(LocalDate startDate, LocalDate endDate, int maxDays) {
        List<DateRange> chunks = new ArrayList<>();
        if (startDate.isAfter(endDate)) {
            return chunks;
        }
        int step = maxDays > 0 ? maxDays : 28;
        LocalDate cursorEnd = endDate;
        while (!cursorEnd.isBefore(startDate)) {
            LocalDate candidateStart = cursorEnd.minusDays(step - 1L);
            LocalDate cursorStart = candidateStart.isBefore(startDate) ? startDate : candidateStart;
            chunks.add(new DateRange(cursorStart, cursorEnd));
            cursorEnd = cursorStart.minusDays(1);
        }
        return chunks;
    }

    public static LocalDate parseTimestamp(Object val) {
        if (val == null) {
            return LocalDate.now(ZoneOffset.UTC);
        }
        if (val instanceof Number num) {
            return Instant.ofEpochMilli(num.longValue()).atZone(ZoneOffset.UTC).toLocalDate();
        }
        String text = val.toString().trim();
        if (text.isEmpty()) {
            return LocalDate.now(ZoneOffset.UTC);
        }
        if (text.length() >= 10) {
            String head = text.substring(0, 10);
            try {
                return LocalDate.parse(head, ISO_DATE_FMT);
            } catch (Exception ignored) {}
            try {
                return LocalDate.parse(head, TR_DATE_FMT);
            } catch (Exception ignored) {}
        }
        if (text.length() == 8 && text.chars().allMatch(Character::isDigit)) {
            try {
                return LocalDate.parse(text, API_DATE_FMT);
            } catch (Exception ignored) {}
        }
        try {
            long ms = Long.parseLong(text);
            return Instant.ofEpochMilli(ms).atZone(ZoneOffset.UTC).toLocalDate();
        } catch (Exception ignored) {
            return LocalDate.now(ZoneOffset.UTC);
        }
    }
}
