package com.tefas.helpers;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Tarih yardımcı sınıfı
 */
public class DateHelper {
    private static final DateTimeFormatter API_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter PARSE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private DateHelper() {}

    /**
     * Son iş gününü döndürür
     */
    public static LocalDate getLastBusinessDay() {
        LocalDate date = LocalDate.now();
        DayOfWeek day = date.getDayOfWeek();
        
        if (day == DayOfWeek.SATURDAY) {
            return date.minusDays(1);
        } else if (day == DayOfWeek.SUNDAY) {
            return date.minusDays(2);
        }
        return date;
    }

    /**
     * Tarihi API formatına çevirir (dd.MM.yyyy)
     */
    public static String formatDate(LocalDate date) {
        return date.format(API_FORMAT);
    }

    /**
     * API tarih stringini LocalDate'e çevirir
     */
    public static LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) {
            return LocalDate.now();
        }
        for (DateTimeFormatter formatter : new DateTimeFormatter[] {
                DateTimeFormatter.ofPattern("yyyyMMdd"),
                DateTimeFormatter.ISO_LOCAL_DATE, PARSE_FORMAT }) {
            try { return LocalDate.parse(dateStr.substring(0, Math.min(dateStr.length(), 10)), formatter); }
            catch (Exception ignored) {}
        }
        return LocalDate.now();
    }
}
