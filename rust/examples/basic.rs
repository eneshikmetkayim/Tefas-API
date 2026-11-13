use tefas_api::{FundType, SortBy, TefasClient};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = TefasClient::new()?;

    let summary = client.get_market_summary(FundType::Yat, None).await?;
    println!(
        "{}: {} fon | {:.2} TL | {} yatırımcı",
        summary.fund_type.description(),
        summary.total_funds,
        summary.total_value,
        summary.total_investors
    );

    let top = client
        .get_top_funds(FundType::Yat, None, SortBy::TotalValue, 5, false)
        .await?;
    for fund in top {
        println!("{} - {} ({:.2} TL)", fund.code, fund.name, fund.total_value);
    }

    if let Some(info) = client.get_fund_info("AAL", "TR").await? {
        println!(
            "AAL fiyat: {:.6} | kategori: {} ({}/{})",
            info.last_price, info.category, info.category_rank, info.category_fund_count
        );
    }

    let anns = client.get_announcements("TR").await?;
    println!("Duyuru sayısı: {}", anns.len());
    Ok(())
}
