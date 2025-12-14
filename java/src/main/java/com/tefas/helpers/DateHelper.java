package com.tefas.helpers;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Tarih yardımcı sınıfı
 */
public class DateHelper {
    private static final DateTimeFormatter API_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
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
        try {
            return LocalDate.parse(dateStr, PARSE_FORMAT);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }
}
